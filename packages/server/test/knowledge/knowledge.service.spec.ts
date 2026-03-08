import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { Logger, NotFoundException } from '@nestjs/common'
import { KnowledgeService } from '../../src/modules/knowledge/knowledge.service'
import { KnowledgeArticle } from '../../src/modules/knowledge/entities/knowledge-article.entity'
import { KnowledgeCategory } from '../../src/modules/knowledge/entities/knowledge-category.entity'
import { ArticleLike } from '../../src/modules/knowledge/entities/article-like.entity'
import { ArticleFavorite } from '../../src/modules/knowledge/entities/article-favorite.entity'
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
  let likeRepo: MockRepository<ArticleLike>
  let favoriteRepo: MockRepository<ArticleFavorite>
  let redis: MockRedisService

  beforeEach(async () => {
    articleRepo = createMockRepository<KnowledgeArticle>()
    categoryRepo = createMockRepository<KnowledgeCategory>()
    likeRepo = createMockRepository<ArticleLike>()
    favoriteRepo = createMockRepository<ArticleFavorite>()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KnowledgeArticle), useValue: articleRepo },
        { provide: getRepositoryToken(KnowledgeCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(ArticleLike), useValue: likeRepo },
        { provide: getRepositoryToken(ArticleFavorite), useValue: favoriteRepo },
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

    it('should still create article when embedding queue fails', async () => {
      const dto = { title: 'Queue Failure Article', content: 'Content', authorId: 1 }
      const article = fixtures.knowledgeArticle({ id: 77, ...dto })
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
      articleRepo.create.mockReturnValue(article)
      articleRepo.save.mockResolvedValue(article)
      mockEmbeddingQueue.add.mockRejectedValueOnce(new Error('queue unavailable'))

      const result = await service.createArticle(dto as never)

      expect(result.id).toBe(77)
      expect(result.title).toBe('Queue Failure Article')
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to queue embedding for article #77'),
        expect.stringContaining('queue unavailable'),
      )
    })
  })

  /* ---------- findAllArticles ---------- */
  describe('findAllArticles', () => {
    it('should use default page and pageSize when omitted', async () => {
      const qb = createMockQueryBuilder([], 0)
      articleRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAllArticles({} as never)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })

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

    it('should not trigger embedding when only non-content fields change', async () => {
      mockEmbeddingQueue.add.mockClear()
      const article = fixtures.knowledgeArticle()
      articleRepo.findOne.mockResolvedValue({ ...article })
      articleRepo.save.mockImplementation(async (a) => a)

      await service.updateArticle(1, { isPublished: false } as never)

      expect(mockEmbeddingQueue.add).not.toHaveBeenCalled()
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

  /* ---------- like / favorite ---------- */
  describe('toggleLike', () => {
    it('should like article when not liked and return liked=true', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 1 })

      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      likeRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 10, articleId: 1, userId: 2 })
      likeRepo.create.mockReturnValue({ articleId: 1, userId: 2 })
      likeRepo.save.mockResolvedValue({ id: 10, articleId: 1, userId: 2 })
      articleRepo.increment.mockResolvedValue(undefined)
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleLike(1, 2)

      expect(likeRepo.save).toHaveBeenCalled()
      expect(articleRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'likeCount', 1)
      expect(result).toEqual({ liked: true, favorited: false, likeCount: 1 })
    })

    it('should unlike article when already liked and return liked=false', async () => {
      const articleBefore = fixtures.knowledgeArticle({ id: 1, likeCount: 1 })
      const articleAfter = fixtures.knowledgeArticle({ id: 1, likeCount: 0 })
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }

      articleRepo.findOne.mockResolvedValueOnce(articleBefore).mockResolvedValueOnce(articleAfter)
      articleRepo.createQueryBuilder.mockReturnValue(qb as never)
      likeRepo.findOne.mockResolvedValueOnce({ id: 7, articleId: 1, userId: 2 }).mockResolvedValueOnce(null)
      likeRepo.delete.mockResolvedValue({ affected: 1 })
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleLike(1, 2)

      expect(likeRepo.delete).toHaveBeenCalledWith({ id: 7 })
      expect(qb.execute).toHaveBeenCalled()
      expect(result).toEqual({ liked: false, favorited: false, likeCount: 0 })
    })

    it('should keep likeCount at 0 when unliking article with likeCount=0', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 0 })
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }

      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      articleRepo.createQueryBuilder.mockReturnValue(qb as never)
      likeRepo.findOne.mockResolvedValueOnce({ id: 9, articleId: 1, userId: 2 }).mockResolvedValueOnce(null)
      likeRepo.delete.mockResolvedValue({ affected: 1 })
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleLike(1, 2)

      expect(result.likeCount).toBe(0)
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          likeCount: expect.any(Function),
        }),
      )
    })

    it('should throw NotFoundException when article does not exist', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.toggleLike(123, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('toggleFavorite', () => {
    it('should favorite article when not favorited and return favorited=true', async () => {
      const article = fixtures.knowledgeArticle({ id: 2, likeCount: 5 })

      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      favoriteRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 3, articleId: 2, userId: 1 })
      favoriteRepo.create.mockReturnValue({ articleId: 2, userId: 1 })
      favoriteRepo.save.mockResolvedValue({ id: 3, articleId: 2, userId: 1 })
      likeRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleFavorite(2, 1)

      expect(favoriteRepo.save).toHaveBeenCalled()
      expect(result).toEqual({ liked: false, favorited: true, likeCount: 5 })
    })

    it('should unfavorite article when already favorited and return favorited=false', async () => {
      const article = fixtures.knowledgeArticle({ id: 2, likeCount: 5 })

      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      favoriteRepo.findOne
        .mockResolvedValueOnce({ id: 3, articleId: 2, userId: 1 })
        .mockResolvedValueOnce(null)
      favoriteRepo.delete.mockResolvedValue({ affected: 1 })
      likeRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleFavorite(2, 1)

      expect(favoriteRepo.delete).toHaveBeenCalledWith({ id: 3 })
      expect(result).toEqual({ liked: false, favorited: false, likeCount: 5 })
    })

    it('should throw NotFoundException when article does not exist', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.toggleFavorite(123, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getArticleActionStatus', () => {
    it('should return liked=false and favorited=false when no actions', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 0 })

      articleRepo.findOne.mockResolvedValue(article)
      likeRepo.findOne.mockResolvedValue(null)
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.getArticleActionStatus(1, 1)

      expect(result).toEqual({ liked: false, favorited: false, likeCount: 0 })
    })

    it('should return liked=true and favorited=false after like action', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 3 })

      articleRepo.findOne.mockResolvedValue(article)
      likeRepo.findOne.mockResolvedValue({ id: 1, articleId: 1, userId: 1 })
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.getArticleActionStatus(1, 1)

      expect(result).toEqual({ liked: true, favorited: false, likeCount: 3 })
    })

    it('should throw NotFoundException when article does not exist', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.getArticleActionStatus(404, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUserFavorites', () => {
    it('should return empty list when user has no favorites', async () => {
      favoriteRepo.find.mockResolvedValue([])

      const result = await service.getUserFavorites(1)

      expect(result).toEqual([])
      expect(articleRepo.find).not.toHaveBeenCalled()
    })

    it('should return articles ordered by favorite createdAt DESC', async () => {
      favoriteRepo.find.mockResolvedValue([
        { articleId: 2, userId: 1, createdAt: new Date('2026-01-02') },
        { articleId: 1, userId: 1, createdAt: new Date('2026-01-01') },
      ])
      articleRepo.find.mockResolvedValue([
        fixtures.knowledgeArticle({ id: 1, title: 'A1' }),
        fixtures.knowledgeArticle({ id: 2, title: 'A2' }),
      ])

      const result = await service.getUserFavorites(1)

      expect(favoriteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
          order: { createdAt: 'DESC' },
        }),
      )
      expect(result.map((item) => item.id)).toEqual([2, 1])
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

    it('should fallback to default source title and zero similarity when best match is not found', async () => {
      mockAiService.embedSingle.mockResolvedValue([0.2, 0.3])
      mockVectorService.search.mockReturnValue([
        { articleId: Number.NaN, chunkIndex: 0, content: 'unknown chunk', similarity: 0.42 },
      ])

      const qb = createMockQueryBuilder([], 0)
      articleRepo.createQueryBuilder.mockReturnValue(qb)
      mockAiService.chat.mockResolvedValue('fallback answer')

      const result = await service.ask('edge case')

      expect(result.answer).toBe('fallback answer')
      expect(result.sources).toHaveLength(1)
      expect(Number.isNaN(result.sources[0].articleId)).toBe(true)
      expect(result.sources[0].similarity).toBe(0)
      expect(typeof result.sources[0].title).toBe('string')
    })
  })
})
