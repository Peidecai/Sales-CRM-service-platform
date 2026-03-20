import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { ForumPostService } from '../../src/modules/forum/forum-post.service'
import { ForumPost } from '../../src/modules/forum/entities/forum-post.entity'
import { ForumLike } from '../../src/modules/forum/entities/forum-like.entity'
import { ForumFavorite } from '../../src/modules/forum/entities/forum-favorite.entity'
import { ForumCategory } from '../../src/modules/forum/entities/forum-category.entity'
import { createMockRepository, createMockQueryBuilder, type MockRepository } from '../test-utils'

describe('ForumPostService', () => {
  let service: ForumPostService
  let postRepo: MockRepository
  let likeRepo: MockRepository
  let favoriteRepo: MockRepository
  let categoryRepo: MockRepository

  beforeEach(async () => {
    postRepo = createMockRepository()
    likeRepo = createMockRepository()
    favoriteRepo = createMockRepository()
    categoryRepo = createMockRepository()

    const module = await Test.createTestingModule({
      providers: [
        ForumPostService,
        { provide: getRepositoryToken(ForumPost), useValue: postRepo },
        { provide: getRepositoryToken(ForumLike), useValue: likeRepo },
        { provide: getRepositoryToken(ForumFavorite), useValue: favoriteRepo },
        { provide: getRepositoryToken(ForumCategory), useValue: categoryRepo },
      ],
    }).compile()

    service = module.get(ForumPostService)
  })

  const mockPost = {
    id: 1,
    title: 'Test Post',
    content: 'Content',
    categoryId: 1,
    authorId: 1,
    isPinned: false,
    isFeatured: false,
    isLocked: false,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    linkedArticleId: null,
    lastCommentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  describe('create', () => {
    it('should create a post and increment category postCount', async () => {
      postRepo.create.mockReturnValue(mockPost)
      postRepo.save.mockResolvedValue(mockPost)
      categoryRepo.increment.mockResolvedValue(undefined)

      const result = await service.create({ title: 'Test', content: 'Content', categoryId: 1 }, 1)
      expect(result).toEqual(mockPost)
      expect(categoryRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'postCount', 1)
    })
  })

  describe('findAll', () => {
    it('should return paginated posts', async () => {
      const qb = createMockQueryBuilder([mockPost], 1)
      postRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 10 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by categoryId', async () => {
      const qb = createMockQueryBuilder([], 0)
      postRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ categoryId: 1, page: 1, pageSize: 10 })
      expect(qb.andWhere).toHaveBeenCalledWith('post.category_id = :categoryId', { categoryId: 1 })
    })

    it('should filter by keyword', async () => {
      const qb = createMockQueryBuilder([], 0)
      postRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ keyword: 'test', page: 1, pageSize: 10 })
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(post.title LIKE :kw OR post.content LIKE :kw)',
        { kw: '%test%' },
      )
    })

    it('should sort by popular', async () => {
      const qb = createMockQueryBuilder([], 0)
      postRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ sortBy: 'popular', page: 1, pageSize: 10 })
      expect(qb.addOrderBy).toHaveBeenCalledWith('post.like_count', 'DESC')
    })
  })

  describe('findOne', () => {
    it('should return post and increment view count', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost })
      postRepo.increment.mockResolvedValue(undefined)
      likeRepo.findOne.mockResolvedValue(null)
      favoriteRepo.findOne.mockResolvedValue(null)

      const result = await service.findOne(1, 1)
      expect(result.viewCount).toBe(1)
      expect(result.isLiked).toBe(false)
      expect(result.isFavorited).toBe(false)
    })

    it('should throw NotFoundException if post not found', async () => {
      postRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update post by author', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost })
      postRepo.save.mockImplementation(async (p) => p)

      const result = await service.update(1, { title: 'Updated' }, 1)
      expect(result.title).toBe('Updated')
    })

    it('should throw ForbiddenException if not author', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost, authorId: 2 })
      await expect(service.update(1, { title: 'X' }, 1)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('remove', () => {
    it('should allow author to delete', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost })
      categoryRepo.decrement.mockResolvedValue(undefined)
      postRepo.softRemove.mockResolvedValue(undefined)

      await service.remove(1, 1, UserRole.SALES)
      expect(postRepo.softRemove).toHaveBeenCalled()
    })

    it('should allow admin to delete', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost, authorId: 2 })
      categoryRepo.decrement.mockResolvedValue(undefined)
      postRepo.softRemove.mockResolvedValue(undefined)

      await service.remove(1, 1, UserRole.ADMIN)
      expect(postRepo.softRemove).toHaveBeenCalled()
    })

    it('should reject non-author non-admin', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost, authorId: 2 })
      await expect(service.remove(1, 1, UserRole.SALES)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('toggleLike', () => {
    it('should add like if not exists', async () => {
      likeRepo.findOne.mockResolvedValue(null)
      likeRepo.create.mockReturnValue({ userId: 1, targetType: 'post', targetId: 1 })
      likeRepo.save.mockResolvedValue(undefined)
      postRepo.increment.mockResolvedValue(undefined)

      const result = await service.toggleLike(1, 1)
      expect(result.liked).toBe(true)
    })

    it('should remove like if exists', async () => {
      likeRepo.findOne.mockResolvedValue({ id: 1 })
      likeRepo.remove.mockResolvedValue(undefined)
      postRepo.decrement.mockResolvedValue(undefined)

      const result = await service.toggleLike(1, 1)
      expect(result.liked).toBe(false)
    })
  })
})
