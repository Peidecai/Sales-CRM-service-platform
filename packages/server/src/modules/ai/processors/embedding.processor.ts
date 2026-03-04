import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { KnowledgeArticle } from '../../knowledge/entities/knowledge-article.entity'
import { AiService } from '../ai.service'
import { VectorService } from '../vector/vector.service'

export interface EmbeddingJobData {
  articleId: number
}

/** Max chunk size in characters (~500 tokens ≈ 750 chars for Chinese) */
const CHUNK_SIZE = 800
/** Overlap between chunks */
const CHUNK_OVERLAP = 100

@Processor('embedding')
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name)

  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly articleRepository: Repository<KnowledgeArticle>,
    private readonly aiService: AiService,
    private readonly vectorService: VectorService,
  ) {}

  @Process()
  async handleEmbedding(job: Job<EmbeddingJobData>): Promise<void> {
    const { articleId } = job.data
    this.logger.log(`Processing embeddings for article #${articleId}`)

    try {
      const article = await this.articleRepository.findOne({
        where: { id: articleId, deleted: false },
      })

      if (!article) {
        this.logger.warn(`Article #${articleId} not found, removing old vectors`)
        this.vectorService.deleteArticleVectors(articleId)
        return
      }

      // Chunk the article content
      const fullText = `${article.title}\n\n${article.content}`
      const chunks = splitIntoChunks(fullText, CHUNK_SIZE, CHUNK_OVERLAP)

      if (chunks.length === 0) {
        this.logger.warn(`Article #${articleId} has no content to embed`)
        return
      }

      // Generate embeddings for all chunks
      const embeddings = await this.aiService.embed(chunks)

      // Store in vector DB
      const vectorData = chunks.map((content, i) => ({
        content,
        embedding: embeddings[i],
      }))

      this.vectorService.upsertArticleVectors(articleId, vectorData)

      this.logger.log(`Embedded article #${articleId}: ${chunks.length} chunks stored`)
    } catch (error) {
      this.logger.error(`Failed to embed article #${articleId}`, String(error))
      throw error // Let Bull retry
    }
  }
}

/**
 * Split text into overlapping chunks.
 */
function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []

  if (text.length <= chunkSize) {
    return [text.trim()].filter(Boolean)
  }

  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk) {
      chunks.push(chunk)
    }
    if (end >= text.length) break
    start = end - overlap
  }

  return chunks
}
