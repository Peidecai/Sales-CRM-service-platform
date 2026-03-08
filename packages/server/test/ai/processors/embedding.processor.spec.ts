import { EmbeddingProcessor } from '../../../src/modules/ai/processors/embedding.processor'

describe('EmbeddingProcessor', () => {
  let processor: EmbeddingProcessor
  let articleRepository: {
    findOne: jest.Mock
  }
  let aiService: {
    embed: jest.Mock
  }
  let vectorService: {
    upsertArticleVectors: jest.Mock
    deleteArticleVectors: jest.Mock
  }

  beforeEach(() => {
    articleRepository = {
      findOne: jest.fn(),
    }
    aiService = {
      embed: jest.fn(),
    }
    vectorService = {
      upsertArticleVectors: jest.fn(),
      deleteArticleVectors: jest.fn(),
    }

    processor = new EmbeddingProcessor(
      articleRepository as never,
      aiService as never,
      vectorService as never,
    )
  })

  it('should remove old vectors when article is missing', async () => {
    articleRepository.findOne.mockResolvedValue(null)

    await processor.handleEmbedding({ data: { articleId: 11 } } as never)

    expect(vectorService.deleteArticleVectors).toHaveBeenCalledWith(11)
    expect(aiService.embed).not.toHaveBeenCalled()
    expect(vectorService.upsertArticleVectors).not.toHaveBeenCalled()
  })

  it('should skip when article has no embeddable content', async () => {
    articleRepository.findOne.mockResolvedValue({
      id: 12,
      title: '',
      content: '',
      deleted: false,
    })

    await processor.handleEmbedding({ data: { articleId: 12 } } as never)

    expect(aiService.embed).not.toHaveBeenCalled()
    expect(vectorService.upsertArticleVectors).not.toHaveBeenCalled()
  })

  it('should split, embed and upsert vectors for article', async () => {
    const longContent = 'A'.repeat(1300)
    articleRepository.findOne.mockResolvedValue({
      id: 13,
      title: 'Playbook',
      content: longContent,
      deleted: false,
    })
    aiService.embed.mockImplementation(async (chunks: string[]) =>
      chunks.map((_, i) => [i + 0.1, i + 0.2]),
    )

    await processor.handleEmbedding({ data: { articleId: 13 } } as never)

    expect(aiService.embed).toHaveBeenCalled()
    const inputChunks = aiService.embed.mock.calls[0][0] as string[]
    expect(inputChunks.length).toBeGreaterThan(1)
    expect(vectorService.upsertArticleVectors).toHaveBeenCalledWith(
      13,
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.any(String),
          embedding: expect.any(Array),
        }),
      ]),
    )
  })

  it('should rethrow when embedding generation fails', async () => {
    articleRepository.findOne.mockResolvedValue({
      id: 14,
      title: 'Article',
      content: 'Body content',
      deleted: false,
    })
    aiService.embed.mockRejectedValue(new Error('embed failed'))

    await expect(
      processor.handleEmbedding({ data: { articleId: 14 } } as never),
    ).rejects.toThrow('embed failed')
  })
})
