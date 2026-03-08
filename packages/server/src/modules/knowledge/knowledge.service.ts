import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, QueryFailedError, Repository } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { ArticleLike } from './entities/article-like.entity'
import { ArticleFavorite } from './entities/article-favorite.entity'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { QueryArticleDto } from './dto/query-article.dto'
import { CreateCategoryDto } from './dto/create-category.dto'
import { ArticleActionResponseDto } from './dto/article-action-response.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import { AiService } from '../ai/ai.service'
import { VectorService } from '../ai/vector/vector.service'
import type { EmbeddingJobData } from '../ai/processors/embedding.processor'

export interface AskResult {
  answer: string
  sources: { articleId: number; title: string; similarity: number }[]
}

const RAG_SYSTEM_PROMPT = `你是一个专业的销售知识库助手。请根据以下参考资料回答用户的问题。

规则：
1. 仅根据提供的参考资料回答，不要编造信息
2. 如果参考资料中没有相关信息，请如实告知
3. 回答要简洁、专业、有条理
4. 如果可以，引用具体来源文章

参考资料：
{context}`

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name)

  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly articleRepository: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeCategory)
    private readonly categoryRepository: Repository<KnowledgeCategory>,
    @InjectRepository(ArticleLike)
    private readonly likeRepository: Repository<ArticleLike>,
    @InjectRepository(ArticleFavorite)
    private readonly favoriteRepository: Repository<ArticleFavorite>,
    private readonly redisService: RedisService,
    private readonly aiService: AiService,
    private readonly vectorService: VectorService,
    @InjectQueue('embedding')
    private readonly embeddingQueue: Queue<EmbeddingJobData>,
  ) {}

  // ---- Article Methods ----

  async createArticle(dto: CreateArticleDto): Promise<KnowledgeArticle> {
    const article = this.articleRepository.create(dto)
    const saved = await this.articleRepository.save(article)

    // Trigger async embedding
    await this.triggerEmbedding(saved.id)

    return saved
  }

  async findAllArticles(
    query: QueryArticleDto,
  ): Promise<{ list: KnowledgeArticle[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, categoryId, isPublished } = query

    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .where('article.deleted = :deleted', { deleted: false })

    if (keyword) {
      qb.andWhere('article.title LIKE :kw', { kw: `%${keyword}%` })
    }

    if (categoryId !== undefined) {
      qb.andWhere('article.categoryId = :categoryId', { categoryId })
    }

    if (isPublished !== undefined) {
      qb.andWhere('article.isPublished = :isPublished', { isPublished })
    }

    qb.orderBy('article.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()

    return { list, total }
  }

  async findOneArticle(id: number): Promise<KnowledgeArticle> {
    const article = await this.articleRepository.findOne({
      where: { id, deleted: false },
    })

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`)
    }

    // Increment view count
    article.viewCount += 1
    await this.articleRepository.save(article)

    return article
  }

  async updateArticle(id: number, dto: UpdateArticleDto): Promise<KnowledgeArticle> {
    const article = await this.findOneArticle(id)
    Object.assign(article, dto)
    const saved = await this.articleRepository.save(article)

    // Re-trigger embedding if content changed
    if (dto.content || dto.title) {
      await this.triggerEmbedding(saved.id)
    }

    return saved
  }

  async removeArticle(id: number): Promise<void> {
    const article = await this.findOneArticle(id)
    article.deleted = true
    await this.articleRepository.save(article)

    // Remove vectors for deleted article
    this.vectorService.deleteArticleVectors(id)
  }

  async toggleLike(articleId: number, userId: number): Promise<ArticleActionResponseDto> {
    await this.getArticleOrFail(articleId)

    const existing = await this.likeRepository.findOne({ where: { articleId, userId } })
    if (existing) {
      const deleteResult = await this.likeRepository.delete({ id: existing.id })
      if (deleteResult.affected && deleteResult.affected > 0) {
        await this.decrementLikeCount(articleId)
      }
      return this.getArticleActionStatus(articleId, userId)
    }

    try {
      await this.likeRepository.save(this.likeRepository.create({ articleId, userId }))
      await this.articleRepository.increment({ id: articleId }, 'likeCount', 1)
    } catch (error) {
      if (!this.isDuplicateEntryError(error)) {
        throw error
      }
    }

    return this.getArticleActionStatus(articleId, userId)
  }

  async toggleFavorite(articleId: number, userId: number): Promise<ArticleActionResponseDto> {
    await this.getArticleOrFail(articleId)

    const existing = await this.favoriteRepository.findOne({ where: { articleId, userId } })
    if (existing) {
      await this.favoriteRepository.delete({ id: existing.id })
      return this.getArticleActionStatus(articleId, userId)
    }

    try {
      await this.favoriteRepository.save(this.favoriteRepository.create({ articleId, userId }))
    } catch (error) {
      if (!this.isDuplicateEntryError(error)) {
        throw error
      }
    }

    return this.getArticleActionStatus(articleId, userId)
  }

  async getArticleActionStatus(
    articleId: number,
    userId: number,
  ): Promise<ArticleActionResponseDto> {
    const article = await this.getArticleOrFail(articleId)
    const [liked, favorited] = await Promise.all([
      this.isLiked(articleId, userId),
      this.isFavorited(articleId, userId),
    ])

    return {
      liked,
      favorited,
      likeCount: article.likeCount,
    }
  }

  async getUserFavorites(userId: number): Promise<KnowledgeArticle[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })

    if (favorites.length === 0) {
      return []
    }

    const articleIds = favorites.map((favorite) => favorite.articleId)
    const articles = await this.articleRepository.find({
      where: { id: In(articleIds), deleted: false },
    })
    const articleMap = new Map(articles.map((article) => [article.id, article]))

    return articleIds
      .map((id) => articleMap.get(id))
      .filter((article): article is KnowledgeArticle => Boolean(article))
  }

  // ---- Category Methods ----

  async createCategory(dto: CreateCategoryDto): Promise<KnowledgeCategory> {
    const category = this.categoryRepository.create(dto)
    const saved = await this.categoryRepository.save(category)
    await this.invalidateCategoryCache()
    return saved
  }

  async findAllCategories(): Promise<KnowledgeCategory[]> {
    // Check cache first
    const cached = await this.redisService.get(CACHE_KEYS.CATEGORY_TREE)
    if (cached) {
      return JSON.parse(cached) as KnowledgeCategory[]
    }

    const categories = await this.categoryRepository.find({
      where: { deleted: false },
      relations: ['children'],
      order: { sort: 'ASC' },
    })

    await this.redisService.set(
      CACHE_KEYS.CATEGORY_TREE,
      JSON.stringify(categories),
      CACHE_TTL.CATEGORY_TREE,
    )
    return categories
  }

  async removeCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id, deleted: false },
    })

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`)
    }

    category.deleted = true
    await this.categoryRepository.save(category)
    await this.invalidateCategoryCache()
  }

  // ---- AI / RAG Methods ----

  /**
   * RAG-based knowledge Q&A.
   * Embeds the question → searches vectors → assembles context → calls LLM.
   */
  async ask(question: string, topK = 5): Promise<AskResult> {
    // 1. Embed the question
    const queryEmbedding = await this.aiService.embedSingle(question)

    // 2. Vector search for relevant chunks
    const searchResults = this.vectorService.search(queryEmbedding, topK)

    if (searchResults.length === 0) {
      return {
        answer: '抱歉，知识库中暂无相关信息，无法回答此问题。',
        sources: [],
      }
    }

    // 3. Fetch article titles for sources (deduplicate by articleId)
    const articleIds = [...new Set(searchResults.map((r) => r.articleId))]
    const articles = await this.articleRepository
      .createQueryBuilder('a')
      .select(['a.id', 'a.title'])
      .where('a.id IN (:...ids)', { ids: articleIds })
      .getMany()

    const articleMap = new Map(articles.map((a) => [a.id, a.title]))

    // 4. Assemble context
    const context = searchResults
      .map(
        (r, i) =>
          `[${i + 1}] (文章: ${articleMap.get(r.articleId) ?? '未知'}, 相关度: ${(r.similarity * 100).toFixed(1)}%)\n${r.content}`,
      )
      .join('\n\n')

    const systemPrompt = RAG_SYSTEM_PROMPT.replace('{context}', context)

    // 5. Call LLM
    const answer = await this.aiService.chat(systemPrompt, question, {
      temperature: 0.3,
      maxTokens: 2048,
    })

    // 6. Build sources
    const sources = articleIds.map((id) => {
      const bestMatch = searchResults.find((r) => r.articleId === id)
      return {
        articleId: id,
        title: articleMap.get(id) ?? '未知',
        similarity: bestMatch ? bestMatch.similarity : 0,
      }
    })

    return { answer, sources }
  }

  // ---- Private Helpers ----

  private async getArticleOrFail(articleId: number): Promise<KnowledgeArticle> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId, deleted: false },
    })

    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`)
    }

    return article
  }

  private async isLiked(articleId: number, userId: number): Promise<boolean> {
    const like = await this.likeRepository.findOne({ where: { articleId, userId } })
    return Boolean(like)
  }

  private async isFavorited(articleId: number, userId: number): Promise<boolean> {
    const favorite = await this.favoriteRepository.findOne({ where: { articleId, userId } })
    return Boolean(favorite)
  }

  private async decrementLikeCount(articleId: number): Promise<void> {
    await this.articleRepository
      .createQueryBuilder()
      .update(KnowledgeArticle)
      .set({
        likeCount: () => 'CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END',
      })
      .where('id = :id', { id: articleId })
      .execute()
  }

  private isDuplicateEntryError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false
    }

    const mysqlError = error as QueryFailedError & { code?: string; errno?: number }
    return mysqlError.code === 'ER_DUP_ENTRY' || mysqlError.errno === 1062
  }

  /** Invalidate category tree cache */
  private async invalidateCategoryCache(): Promise<void> {
    await this.redisService.del(CACHE_KEYS.CATEGORY_TREE)
  }

  /** Trigger async embedding for an article via Bull queue */
  private async triggerEmbedding(articleId: number): Promise<void> {
    try {
      await this.embeddingQueue.add(
        { articleId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      )
      this.logger.log(`Embedding job queued for article #${articleId}`)
    } catch (error) {
      this.logger.error(`Failed to queue embedding for article #${articleId}`, String(error))
    }
  }
}
