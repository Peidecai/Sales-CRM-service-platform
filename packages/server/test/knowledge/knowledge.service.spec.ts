import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { NotFoundException } from '@nestjs/common'
import { KnowledgeService } from '../../src/modules/knowledge/knowledge.service'
import { KnowledgeArticle } from '../../src/modules/knowledge/entities/knowledge-article.entity'
import { KnowledgeCategory } from '../../src/modules/knowledge/entities/knowledge-category.entity'
import { RedisService } from '../../src/common/redis'
import { AiService } from '../../src/modules/ai/ai.service'
import { VectorService } from '../../src/modules/ai/vector/vector.service'
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockRedisService,
  fixtures,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'

const mockAiService = {
  chat: jest.fn(),
  embed: jest.fn(),
  embedSingle: jest.fn(),
}

const mockVectorService = {
  search: jest.fn(),
  upsertArticleVectors: jest.fn(),
  deleteArticleVectors: jest.fn(),
}

const mockEmbeddingQueue = {
  add: jest.fn().mockResolvedValue({ id: 'embed-job-1' }),
}

describe('KnowledgeService', () => {
  let service: KnowledgeService
  let articleRepo: MockRepository<KnowledgeArticle>
  let categoryRepo: MockRepository<KnowledgeCategory>
  let redis: MockRedisService

  beforeEach(async () => {
    articleRepo = createMockRepository<KnowledgeArticle>()
    categoryRepo = createMockRepository<KnowledgeCategory>()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KnowledgeArticle), useValue: articleRepo },
        { provide: getRepositoryToken(KnowledgeCategory), useValue: categoryRepo },
        { provide: RedisService, useValue: redis },
        { provide: AiService, useValue: mockAiService },
        { provide: VectorService, useValue: mockVectorService },
        { provide: getQueueToken('embedding'), useValue: mockEmbeddingQueue },
      ],
    }).compile()

    service = module.get<KnowledgeService>(KnowledgeService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- createArticle ---------- */
  describe('createArticle', () => {
    it('should create article and trigger embedding', async () => {
      const dto = { title: 'New Article', content: 'Content', authorId: 1 }
      const article = fixtures.knowledgeArticle(dto)
      articleRepo.create.mockReturnValue(article)
      articleRepo.save.mockResolvedValue(article)

      const result = await service.createArticle(dto as never)

      expect(articleRepo.create).toHaveBeenCalledWith(dto)
      expect(articleRepo.save).toHaveBeenCalledWith(article)
      expect(mockEmbeddingQueue.add).toHaveBeenCalledWith(
        { articleId: article.id },
        expect.objectContaining({ attempts: 3 }),
      )
      expect(result.title).toBe('New Article')
    })
  })

  /* ---------- findAllArticles ---------- */
  describe('findAllArticles', () => {
    it('should return paginated article list', async () => {
      const articles = [fixtures.knowledgeArticle()]
      const qb = createMockQueryBuilder(articles, 1)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAllArticles({ page: 1, pageSize: 20 })

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should apply keyword filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAllArticles({ page: 1, pageSize: 20, keyword: 'test' })

      expect(qb.andWhere).toHaveBeenCalledWith(
        'article.title LIKE :kw',
        { kw: '%test%' },
      )
    })

    it('should apply categoryId filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAllArticles({ page: 1, pageSize: 20, categoryId: 3 })

      expect(qb.andWhere).toHaveBeenCalledWith(
        'article.categoryId = :categoryId',
        { categoryId: 3 },
      )
    })

    it('should apply isPublished filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAllArticles({ page: 1, pageSize: 20, isPublished: true } as never)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'article.isPublished = :isPublished',
        { isPublished: true },
      )
    })

    it('should paginate correctly', async () => {
      const qb = createMockQueryBuilder([], 0)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAllArticles({ page: 3, pageSize: 10 })

      expect(qb.skip).toHaveBeenCalledWith(20) // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  /* ---------- findOneArticle ---------- */
  describe('findOneArticle', () => {
    it('should return article and increment viewCount', async () => {
      const article = fixtures.knowledgeArticle({ viewCount: 5 })
      articleRepo.findOne.mockResolvedValue({ ...article })
      articleRepo.save.mockImplementation(async (a) => a)

      const result = await service.findOneArticle(1)

      expect(result.viewCount).toBe(6)
      expect(articleRepo.save).toHaveBeenCalled()
    })

    it('should throw NotFoundException if not found', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.findOneArticle(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- updateArticle ---------- */
  describe('updateArticle', () => {
    it('should update article fields', async () => {
      const article = fixtures.knowledgeArticle()
      articleRepo.findOne.mockResolvedValue({ ...article })
      articleRepo.save.mockImplementation(async (a) => a)

      const result = await service.updateArticle(1, { title: 'Updated Title' } as never)

      expect(result.title).toBe('Updated Title')
    })

    it('should re-trigger embedding when content changes', async () => {
      const article = fixtures.knowledgeArticle()
      articleRepo.findOne.mockResolvedValue({ ...article })
      articleRepo.save.mockImplementation(async (a) => a)

      await service.updateArticle(1, { content: 'New content' } as never)

      expect(mockEmbeddingQueue.add).toHaveBeenCalledWith(
        { articleId: 1 },
        expect.objectContaining({ attempts: 3 }),
      )
    })

    it('should re-trigger embedding when title changes', async () => {
      const article = fixtures.knowledgeArticle()
      articleRepo.findOne.mockResolvedValue({ ...article })
      articleRepo.save.mockImplementation(async (a) => a)

      await service.updateArticle(1, { title: 'New Title' } as never)

      expect(mockEmbeddingQueue.add).toHaveBeenCalled()
    })

    it('should throw NotFoundException if not found', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.updateArticle(999, { title: 'X' } as never)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- removeArticle ---------- */
  describe('removeArticle', () => {
    it('should soft-delete article and remove vectors', async () => {
      const article = fixtures.knowledgeArticle()
      articleRepo.findOne.mockResolvedValue({ ...article })
      articleRepo.save.mockImplementation(async (a) => a)

      await service.removeArticle(1)

      expect(articleRepo.save).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }))
      expect(mockVectorService.deleteArticleVectors).toHaveBeenCalledWith(1)
    })

    it('should throw NotFoundException if not found', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.removeArticle(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- createCategory ---------- */
  describe('createCategory', () => {
    it('should create category and invalidate cache', async () => {
      const dto = { name: 'Sales', description: 'Sales knowledge' }
      const category = fixtures.knowledgeCategory(dto)
      categoryRepo.create.mockReturnValue(category)
      categoryRepo.save.mockResolvedValue(category)

      const result = await service.createCategory(dto as never)

      expect(categoryRepo.create).toHaveBeenCalledWith(dto)
      expect(result.name).toBe('Sales')
      expect(redis.del).toHaveBeenCalledWith('cache:knowledge:categories')
    })
  })

  /* ---------- findAllCategories ---------- */
  describe('findAllCategories', () => {
    it('should return cached categories on cache hit', async () => {
      const categories = [fixtures.knowledgeCategory()]
      redis.get.mockResolvedValue(JSON.stringify(categories))

      const result = await service.findAllCategories()

      expect(result).toHaveLength(1)
      expect(categoryRepo.find).not.toHaveBeenCalled()
    })

    it('should query DB and cache on cache miss', async () => {
      redis.get.mockResolvedValue(null)
      const categories = [fixtures.knowledgeCategory()]
      categoryRepo.find.mockResolvedValue(categories)

      const result = await service.findAllCategories()

      expect(result).toHaveLength(1)
      expect(redis.set).toHaveBeenCalledWith(
        'cache:knowledge:categories',
        expect.any(String),
        600, // CACHE_TTL.CATEGORY_TREE
      )
    })
  })

  /* ---------- removeCategory ---------- */
  describe('removeCategory', () => {
    it('should soft-delete category and invalidate cache', async () => {
      const category = fixtures.knowledgeCategory()
      categoryRepo.findOne.mockResolvedValue({ ...category })
      categoryRepo.save.mockImplementation(async (c) => c)

      await service.removeCategory(1)

      expect(categoryRepo.save).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }))
      expect(redis.del).toHaveBeenCalledWith('cache:knowledge:categories')
    })

    it('should throw NotFoundException if not found', async () => {
      categoryRepo.findOne.mockResolvedValue(null)

      await expect(service.removeCategory(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- ask (RAG Q&A) ---------- */
  describe('ask', () => {
    it('should return no-info answer when no vector results found', async () => {
      mockAiService.embedSingle.mockResolvedValue([0.1, 0.2])
      mockVectorService.search.mockReturnValue([])

      const result = await service.ask('What is the policy?')

      expect(result.answer).toContain('暂无相关信息')
      expect(result.sources).toHaveLength(0)
    })

    it('should perform RAG pipeline and return answer with sources', async () => {
      mockAiService.embedSingle.mockResolvedValue([0.1, 0.2])
      mockVectorService.search.mockReturnValue([
        { articleId: 1, chunkIndex: 0, content: 'Policy says...', similarity: 0.85 },
        { articleId: 2, chunkIndex: 0, content: 'Guideline states...', similarity: 0.72 },
      ])

      // Mock the article title lookup
      const qb = createMockQueryBuilder([
        { id: 1, title: 'Sales Policy' },
        { id: 2, title: 'Sales Guideline' },
      ], 2)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      mockAiService.chat.mockResolvedValue('According to the policy...')

      const result = await service.ask('What is the policy?')

      expect(mockAiService.embedSingle).toHaveBeenCalledWith('What is the policy?')
      expect(mockVectorService.search).toHaveBeenCalledWith(
        [0.1, 0.2],
        5, // default topK
      )
      expect(mockAiService.chat).toHaveBeenCalledWith(
        expect.stringContaining('参考资料'),
        'What is the policy?',
        expect.objectContaining({ temperature: 0.3 }),
      )
      expect(result.answer).toBe('According to the policy...')
      expect(result.sources).toHaveLength(2)
      expect(result.sources[0]).toEqual(
        expect.objectContaining({ articleId: 1, title: 'Sales Policy' }),
      )
    })

    it('should use custom topK parameter', async () => {
      mockAiService.embedSingle.mockResolvedValue([0.1])
      mockVectorService.search.mockReturnValue([])

      await service.ask('question', 3)

      expect(mockVectorService.search).toHaveBeenCalledWith([0.1], 3)
    })
  })
})
