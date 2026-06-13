import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, QueryFailedError, Repository } from 'typeorm'
import { DataSource } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeArticleVersion } from './entities/knowledge-article-version.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { KnowledgeCategoryType, ArticleStatus } from '@crm/shared'
import { ArticleLike } from './entities/article-like.entity'
import { ArticleFavorite } from './entities/article-favorite.entity'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { QueryArticleDto } from './dto/query-article.dto'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
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

/** 分类树节点（支持最多 3 级） */
export interface KnowledgeCategoryTreeNode {
  id: number
  name: string
  parentId: number | null
  categoryCode: string | null
  categoryType: KnowledgeCategoryType
  iconUrl: string | null
  level: number
  path: string | null
  articleCount: number
  sort: number
  children: KnowledgeCategoryTreeNode[]
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
    @InjectRepository(KnowledgeArticleVersion)
    private readonly versionRepository: Repository<KnowledgeArticleVersion>,
    private readonly dataSource: DataSource,
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

    // 文章保存后异步生成向量，避免 AI/队列波动阻塞正文创建。
    await this.triggerEmbedding(saved.id)

    return saved
  }

  async findAllArticles(
    query: QueryArticleDto,
  ): Promise<{ list: KnowledgeArticle[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, categoryId, status, isPublished } = query

    if (keyword && keyword.trim()) {
      return this.searchArticles(keyword.trim(), {
        page,
        pageSize,
        categoryId,
        status,
        isPublished,
      })
    }

    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')

    if (categoryId !== undefined) {
      qb.andWhere('article.categoryId = :categoryId', { categoryId })
    }

    if (status !== undefined) {
      qb.andWhere('article.status = :status', { status })
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

  /**
   * 全文搜索：FULLTEXT MATCH + 加权排序（标题×3 + 置顶×5 + 推荐×2 + 时效衰减 + 热度）
   * keyword 使用参数化，防止 SQL 注入。
   */
  async searchArticles(
    keyword: string,
    options: {
      page?: number
      pageSize?: number
      categoryId?: number
      status?: ArticleStatus
      isPublished?: boolean
    } = {},
  ): Promise<{ list: KnowledgeArticle[]; total: number }> {
    const { page = 1, pageSize = 20, categoryId, status, isPublished } = options
    // FULLTEXT 仍使用参数化；这里额外裁剪危险字符是为了降低 BOOLEAN MODE 语法误伤。
    const safeKeyword =
      String(keyword)
        .replace(/[\\'"%;]/g, ' ')
        .trim()
        .slice(0, 200) || ' '
    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .andWhere('MATCH(article.title, article.content) AGAINST (:keyword IN BOOLEAN MODE)', {
        keyword: safeKeyword,
      })
      .setParameter('keyword', safeKeyword)

    if (categoryId !== undefined) {
      qb.andWhere('article.categoryId = :categoryId', { categoryId })
    }
    if (status !== undefined) {
      qb.andWhere('article.status = :status', { status })
    }
    if (isPublished !== undefined) {
      qb.andWhere('article.isPublished = :isPublished', { isPublished })
    }

    qb.addOrderBy(
      `(MATCH(article.title, article.content) AGAINST (:keyword) * 3 + (CASE WHEN article.is_top = 1 THEN 5 ELSE 0 END) + (CASE WHEN article.is_recommend = 1 THEN 2 ELSE 0 END) + 1/(1+DATEDIFF(NOW(), COALESCE(article.published_at, article.updated_at))*0.01) + (article.view_count + article.like_count)/1000)`,
      'DESC',
    )
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  private static readonly SEARCH_HISTORY_MAX = 50

  async pushSearchHistory(userId: number, keyword: string): Promise<void> {
    const k = keyword.trim().slice(0, 200)
    if (!k) return
    const key = CACHE_KEYS.KNOWLEDGE_SEARCH_HISTORY(userId)
    const score = Date.now()
    await this.redisService.zAdd(key, score, k)
    // 只保留最近 50 条，避免高频搜索用户的 Redis 集合无限增长。
    await this.redisService.zRemRangeByRank(key, 0, -(KnowledgeService.SEARCH_HISTORY_MAX + 1))
  }

  async getSearchHistory(userId: number): Promise<string[]> {
    const key = CACHE_KEYS.KNOWLEDGE_SEARCH_HISTORY(userId)
    return this.redisService.zRevRange(key, 0, 49)
  }

  async getSearchSuggestions(userId: number, q: string): Promise<string[]> {
    const history = await this.getSearchHistory(userId)
    const prefix = (q || '').trim().toLowerCase()
    if (!prefix) return history.slice(0, 10)
    const filtered = history.filter((term) => term.toLowerCase().startsWith(prefix))
    return [...new Set(filtered)].slice(0, 10)
  }

  async findOneArticle(id: number): Promise<KnowledgeArticle> {
    const article = await this.articleRepository.findOne({
      where: { id },
    })

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`)
    }

    // Increment view count
    article.viewCount += 1
    await this.articleRepository.save(article)

    return article
  }

  async updateArticle(
    id: number,
    dto: UpdateArticleDto,
    editedById?: number,
  ): Promise<KnowledgeArticle> {
    const article = await this.findOneArticle(id)
    const oldVersion = article.version ?? 0

    // 更新前先保存版本快照，后续乐观锁失败也能保留本次编辑基线。
    const versionSnapshot = this.versionRepository.create({
      articleId: id,
      version: oldVersion,
      title: article.title,
      content: article.content,
      editedById: editedById ?? article.authorId,
    })
    await this.versionRepository.save(versionSnapshot)

    Object.assign(article, dto)
    article.version = oldVersion + 1

    // QueryBuilder update 只接受列值；剥离 relation 对象避免 TypeORM 尝试写入关联实例。
    const { category: _cat, ...columns } = article
    void _cat

    // Optimistic lock: only update if version hasn't changed
    const result = await this.articleRepository
      .createQueryBuilder()
      .update(KnowledgeArticle)
      .set(columns as Record<string, unknown>)
      .where('id = :id AND version = :oldVersion', { id, oldVersion })
      .execute()

    if (result.affected === 0) {
      throw new ConflictException('文章已被其他人修改，请刷新后重试')
    }

    // 标题也参与 embedding，上下文标题变化时同样需要重建向量。
    if (dto.content || dto.title) {
      await this.triggerEmbedding(id)
    }

    return this.articleRepository.findOneOrFail({ where: { id } })
  }

  async removeArticle(id: number): Promise<void> {
    const article = await this.findOneArticle(id)
    await this.articleRepository.softRemove(article)

    // 软删文章后同步清理向量，防止 RAG 继续召回已删除内容。
    this.vectorService.deleteArticleVectors(id)
  }

  async submitArticle(id: number): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status !== ArticleStatus.DRAFT) {
      throw new BadRequestException('Only draft articles can be submitted')
    }
    article.status = ArticleStatus.SUBMITTED
    await this.articleRepository.save(article)
    return article
  }

  async reviewArticle(
    id: number,
    approved: boolean,
    remark: string | undefined,
    reviewerId: number,
  ): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status !== ArticleStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted articles can be reviewed')
    }
    article.status = approved ? ArticleStatus.PUBLISHED : ArticleStatus.REJECTED
    article.reviewId = reviewerId
    article.reviewRemark = remark ?? null
    article.reviewedAt = new Date()
    if (approved) {
      article.isPublished = true
      article.publishedAt = new Date()
    }
    await this.articleRepository.save(article)
    if (approved) await this.triggerEmbedding(id)
    return article
  }

  async publishArticle(id: number): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status === ArticleStatus.PUBLISHED) {
      return article
    }
    article.status = ArticleStatus.PUBLISHED
    article.isPublished = true
    article.publishedAt = new Date()
    await this.articleRepository.save(article)
    await this.triggerEmbedding(id)
    return article
  }

  async rejectArticle(id: number, remark?: string): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status !== ArticleStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted articles can be rejected')
    }
    article.status = ArticleStatus.REJECTED
    article.reviewRemark = remark ?? null
    await this.articleRepository.save(article)
    return article
  }

  async offlineArticle(id: number): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException('Only published articles can be taken offline')
    }
    article.status = ArticleStatus.OFFLINE
    article.isPublished = false
    await this.articleRepository.save(article)
    return article
  }

  async setTop(id: number, value: boolean): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException('Only published articles can be pinned')
    }
    article.isTop = value
    await this.articleRepository.save(article)
    return article
  }

  async setRecommend(id: number, value: boolean): Promise<KnowledgeArticle> {
    const article = await this.getArticleOrFail(id)
    if (article.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException('Only published articles can be recommended')
    }
    article.isRecommend = value
    await this.articleRepository.save(article)
    return article
  }

  async toggleLike(articleId: number, userId: number): Promise<ArticleActionResponseDto> {
    await this.getArticleOrFail(articleId)

    const existing = await this.likeRepository.findOne({ where: { articleId, userId } })
    if (existing) {
      const deleteResult = await this.likeRepository.delete({ id: existing.id })
      if (deleteResult.affected && deleteResult.affected > 0) {
        // 并发取消点赞时只在实际删除成功后递减，避免计数被扣成负数。
        await this.decrementLikeCount(articleId)
      }
      return this.getArticleActionStatus(articleId, userId)
    }

    try {
      await this.likeRepository.save(this.likeRepository.create({ articleId, userId }))
      await this.articleRepository.increment({ id: articleId }, 'likeCount', 1)
    } catch (error) {
      // 唯一键冲突说明并发点赞已成功写入，直接读取最新状态即可保持幂等。
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
      // 唯一键冲突说明并发收藏已存在，最终状态查询会返回真实结果。
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
      where: { id: In(articleIds) },
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
    // 分类树变更频率低，优先读缓存；写路径统一调用 invalidateCategoryCache。
    const cached = await this.redisService.safeGet(CACHE_KEYS.CATEGORY_TREE)
    if (cached) {
      return JSON.parse(cached) as KnowledgeCategory[]
    }

    const categories = await this.categoryRepository.find({
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

  /**
   * 返回嵌套树结构（最多 3 级），递归构建 children 数组。
   */
  async findTree(): Promise<KnowledgeCategoryTreeNode[]> {
    const list = await this.categoryRepository.find({
      order: { sort: 'ASC' },
    })
    const build = (parentId: number | null, depth: number): KnowledgeCategoryTreeNode[] => {
      if (depth > 3) return []
      return list
        .filter((c) => c.parentId === parentId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
          categoryCode: c.categoryCode ?? null,
          categoryType: c.categoryType,
          iconUrl: c.iconUrl ?? null,
          level: c.level,
          path: c.path ?? null,
          articleCount: c.articleCount,
          sort: c.sort,
          children: build(c.id, depth + 1),
        }))
    }
    return build(null, 1)
  }

  async updateCategory(id: number, dto: UpdateCategoryDto): Promise<KnowledgeCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    })
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`)
    }
    const oldParentId = category.parentId
    if (dto.parentId !== undefined) {
      category.parentId = dto.parentId
    }
    const newParentId = category.parentId
    Object.assign(category, dto)

    await this.dataSource.transaction(async (em) => {
      const catRepo = em.getRepository(KnowledgeCategory)
      await catRepo.save(category)
      const needPathUpdate = newParentId !== oldParentId
      if (needPathUpdate) {
        const parent = newParentId ? await catRepo.findOne({ where: { id: newParentId } }) : null
        const newPath = parent
          ? `${parent.path ?? String(parent.id)}/${category.id}`
          : String(category.id)
        const newLevel = parent ? (parent.level ?? 1) + 1 : 1
        await catRepo.update({ id: category.id }, { path: newPath, level: newLevel })
        category.path = newPath
        category.level = newLevel
        // 父级变化会影响整棵子树的 path/level，必须和当前分类更新处于同一事务。
        await this.syncChildrenPathAndLevel(em, category.id, newPath, newLevel)
      }
    })

    await this.invalidateCategoryCache()
    return this.categoryRepository.findOneOrFail({ where: { id } })
  }

  private async syncChildrenPathAndLevel(
    em: import('typeorm').EntityManager,
    parentId: number,
    parentPath: string,
    parentLevel: number,
  ): Promise<void> {
    const catRepo = em.getRepository(KnowledgeCategory)
    const children = await catRepo.find({
      where: { parentId },
      order: { sort: 'ASC' },
    })
    for (const child of children) {
      const newPath = `${parentPath}/${child.id}`
      const newLevel = parentLevel + 1
      await catRepo.update({ id: child.id }, { path: newPath, level: newLevel })
      await this.syncChildrenPathAndLevel(em, child.id, newPath, newLevel)
    }
  }

  async removeCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    })

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`)
    }

    await this.categoryRepository.softRemove(category)
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

    // 来源列表按 articleId 去重，避免多个分片命中时前端展示重复文章。
    const articleIds = [...new Set(searchResults.map((r) => r.articleId))]
    const articles = await this.articleRepository
      .createQueryBuilder('a')
      .select(['a.id', 'a.title'])
      .where('a.id IN (:...ids)', { ids: articleIds })
      .getMany()

    const articleMap = new Map(articles.map((a) => [a.id, a.title]))

    // 只把命中的片段拼入上下文，减少模型脱离知识库自由发挥的空间。
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

  // ---- Version History Methods ----

  async getVersionHistory(articleId: number): Promise<KnowledgeArticleVersion[]> {
    return this.versionRepository.find({
      where: { articleId },
      order: { version: 'DESC' },
    })
  }

  async getVersion(versionId: number): Promise<KnowledgeArticleVersion> {
    const version = await this.versionRepository.findOne({ where: { id: versionId } })
    if (!version) {
      throw new NotFoundException(`Version with ID ${versionId} not found`)
    }
    return version
  }

  async diffVersions(
    v1Id: number,
    v2Id: number,
  ): Promise<{ v1: KnowledgeArticleVersion; v2: KnowledgeArticleVersion }> {
    const [v1, v2] = await Promise.all([this.getVersion(v1Id), this.getVersion(v2Id)])
    return { v1, v2 }
  }

  // ---- Private Helpers ----

  private async getArticleOrFail(articleId: number): Promise<KnowledgeArticle> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
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
