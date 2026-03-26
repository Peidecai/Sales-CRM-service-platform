import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { ForumCommentService } from '../../src/modules/forum/forum-comment.service'
import { ForumComment } from '../../src/modules/forum/entities/forum-comment.entity'
import { ForumPost } from '../../src/modules/forum/entities/forum-post.entity'
import { ForumLike } from '../../src/modules/forum/entities/forum-like.entity'
import { createMockRepository } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('ForumCommentService', () => {
  let service: ForumCommentService
  let commentRepo: MockRepository
  let postRepo: MockRepository
  let likeRepo: MockRepository

  beforeEach(async () => {
    commentRepo = createMockRepository()
    postRepo = createMockRepository()
    likeRepo = createMockRepository()

    const module = await Test.createTestingModule({
      providers: [
        ForumCommentService,
        { provide: getRepositoryToken(ForumComment), useValue: commentRepo },
        { provide: getRepositoryToken(ForumPost), useValue: postRepo },
        { provide: getRepositoryToken(ForumLike), useValue: likeRepo },
      ],
    }).compile()

    service = module.get(ForumCommentService)
  })

  const mockPost = {
    id: 1, isLocked: false, commentCount: 0,
  }

  const mockComment = {
    id: 1, postId: 1, authorId: 1, content: 'Test comment',
    parentId: null, replyToUserId: null, likeCount: 0,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  }

  describe('create', () => {
    it('should create a comment and update post stats', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost })
      commentRepo.create.mockReturnValue(mockComment)
      commentRepo.save.mockResolvedValue(mockComment)
      postRepo.increment.mockResolvedValue(undefined)
      postRepo.update.mockResolvedValue(undefined)

      const result = await service.create(1, { content: 'Hello' }, 1)
      expect(result).toEqual(mockComment)
      expect(postRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'commentCount', 1)
    })

    it('should throw NotFoundException if post not found', async () => {
      postRepo.findOne.mockResolvedValue(null)
      await expect(service.create(999, { content: 'X' }, 1)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if post is locked', async () => {
      postRepo.findOne.mockResolvedValue({ ...mockPost, isLocked: true })
      await expect(service.create(1, { content: 'X' }, 1)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findByPost', () => {
    it('should return paginated comments', async () => {
      commentRepo.findAndCount.mockResolvedValue([[mockComment], 1])
      const result = await service.findByPost(1, 1, 20)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('remove', () => {
    it('should allow author to delete comment', async () => {
      commentRepo.findOne.mockResolvedValue({ ...mockComment })
      commentRepo.softRemove.mockResolvedValue(undefined)
      postRepo.decrement.mockResolvedValue(undefined)

      await service.remove(1, 1, UserRole.SALES)
      expect(commentRepo.softRemove).toHaveBeenCalled()
    })

    it('should allow admin to delete any comment', async () => {
      commentRepo.findOne.mockResolvedValue({ ...mockComment, authorId: 2 })
      commentRepo.softRemove.mockResolvedValue(undefined)
      postRepo.decrement.mockResolvedValue(undefined)

      await service.remove(1, 1, UserRole.ADMIN)
      expect(commentRepo.softRemove).toHaveBeenCalled()
    })

    it('should reject non-author non-admin', async () => {
      commentRepo.findOne.mockResolvedValue({ ...mockComment, authorId: 2 })
      await expect(service.remove(1, 1, UserRole.SALES)).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException for missing comment', async () => {
      commentRepo.findOne.mockResolvedValue(null)
      await expect(service.remove(999, 1, UserRole.ADMIN)).rejects.toThrow(NotFoundException)
    })
  })

  describe('toggleLike', () => {
    it('should add like when not existing', async () => {
      likeRepo.findOne.mockResolvedValue(null)
      likeRepo.create.mockReturnValue({ userId: 1, targetType: 'comment', targetId: 1 })
      likeRepo.save.mockResolvedValue(undefined)
      commentRepo.increment.mockResolvedValue(undefined)

      const result = await service.toggleLike(1, 1)
      expect(result.liked).toBe(true)
    })
  })
})
