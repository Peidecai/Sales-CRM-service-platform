import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bull'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
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
  createMockRedisService,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('KnowledgeService - Like/Favorite', () => {
  let service: KnowledgeService
  let articleRepo: MockRepository<KnowledgeArticle>
  let likeRepo: MockRepository<ArticleLike>
  let favoriteRepo: MockRepository<ArticleFavorite>

  beforeEach(async () => {
    articleRepo = createMockRepository<KnowledgeArticle>()
    likeRepo = createMockRepository<ArticleLike>()
    favoriteRepo = createMockRepository<ArticleFavorite>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KnowledgeArticle), useValue: articleRepo },
        { provide: getRepositoryToken(KnowledgeCategory), useValue: createMockRepository() },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        { provide: getRepositoryToken(ArticleLike), useValue: likeRepo },
        { provide: getRepositoryToken(ArticleFavorite), useValue: favoriteRepo },
        { provide: RedisService, useValue: createMockRedisService() },
        {
          provide: AiService,
          useValue: { chat: jest.fn(), embed: jest.fn(), embedSingle: jest.fn() },
        },
        {
          provide: VectorService,
          useValue: { search: jest.fn(), upsertArticleVectors: jest.fn(), deleteArticleVectors: jest.fn() },
        },
        { provide: getQueueToken('embedding'), useValue: { add: jest.fn() } },
      ],
    }).compile()

    service = module.get<KnowledgeService>(KnowledgeService)
  })

  describe('toggleLike', () => {
    it('likes article when not liked and increments likeCount', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 1 })
      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      likeRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 11 })
      likeRepo.create.mockReturnValue({ articleId: 1, userId: 1 })
      likeRepo.save.mockResolvedValue({ id: 11 })
      articleRepo.increment.mockResolvedValue(undefined)
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleLike(1, 1)

      expect(result).toEqual({ liked: true, favorited: false, likeCount: 1 })
      expect(articleRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'likeCount', 1)
    })

    it('unlikes article when already liked and decrements likeCount', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }

      articleRepo.findOne
        .mockResolvedValueOnce(fixtures.knowledgeArticle({ id: 1, likeCount: 1 }))
        .mockResolvedValueOnce(fixtures.knowledgeArticle({ id: 1, likeCount: 0 }))
      articleRepo.createQueryBuilder.mockReturnValue(qb as never)
      likeRepo.findOne.mockResolvedValueOnce({ id: 11 }).mockResolvedValueOnce(null)
      likeRepo.delete.mockResolvedValue({ affected: 1 })
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleLike(1, 1)

      expect(result).toEqual({ liked: false, favorited: false, likeCount: 0 })
      expect(qb.execute).toHaveBeenCalled()
    })

    it('throws NotFoundException when article not found', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.toggleLike(999, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('toggleFavorite', () => {
    it('favorites article when not favorited', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 3 })
      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      favoriteRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 9 })
      favoriteRepo.create.mockReturnValue({ articleId: 1, userId: 1 })
      favoriteRepo.save.mockResolvedValue({ id: 9 })
      likeRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleFavorite(1, 1)

      expect(result).toEqual({ liked: false, favorited: true, likeCount: 3 })
    })

    it('unfavorites article when already favorited', async () => {
      const article = fixtures.knowledgeArticle({ id: 1, likeCount: 3 })
      articleRepo.findOne.mockResolvedValueOnce(article).mockResolvedValueOnce(article)
      favoriteRepo.findOne.mockResolvedValueOnce({ id: 9 }).mockResolvedValueOnce(null)
      favoriteRepo.delete.mockResolvedValue({ affected: 1 })
      likeRepo.findOne.mockResolvedValue(null)

      const result = await service.toggleFavorite(1, 1)

      expect(result).toEqual({ liked: false, favorited: false, likeCount: 3 })
    })

    it('throws NotFoundException when article not found', async () => {
      articleRepo.findOne.mockResolvedValue(null)

      await expect(service.toggleFavorite(999, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getArticleActionStatus', () => {
    it('returns default status when user has no action', async () => {
      articleRepo.findOne.mockResolvedValue(fixtures.knowledgeArticle({ id: 1, likeCount: 0 }))
      likeRepo.findOne.mockResolvedValue(null)
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.getArticleActionStatus(1, 1)

      expect(result).toEqual({ liked: false, favorited: false, likeCount: 0 })
    })

    it('returns liked status after like', async () => {
      articleRepo.findOne.mockResolvedValue(fixtures.knowledgeArticle({ id: 1, likeCount: 2 }))
      likeRepo.findOne.mockResolvedValue({ id: 1 })
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.getArticleActionStatus(1, 1)

      expect(result).toEqual({ liked: true, favorited: false, likeCount: 2 })
    })
  })

  describe('getUserFavorites', () => {
    it('returns empty array when no favorites', async () => {
      favoriteRepo.find.mockResolvedValue([])

      const result = await service.getUserFavorites(1)

      expect(result).toEqual([])
    })

    it('returns favorites sorted by favorite createdAt desc', async () => {
      favoriteRepo.find.mockResolvedValue([
        { articleId: 2, createdAt: new Date('2026-01-02') },
        { articleId: 1, createdAt: new Date('2026-01-01') },
      ])
      articleRepo.find.mockResolvedValue([
        fixtures.knowledgeArticle({ id: 1 }),
        fixtures.knowledgeArticle({ id: 2 }),
      ])

      const result = await service.getUserFavorites(1)

      expect(result.map((article) => article.id)).toEqual([2, 1])
    })
  })
})
