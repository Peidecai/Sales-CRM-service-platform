import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TrainingVideoService } from '../../src/modules/training/training-video.service'
import { TrainingVideo } from '../../src/modules/training/entities/training-video.entity'
import { VideoChapter } from '../../src/modules/training/entities/video-chapter.entity'
import { createMockRepository, createMockQueryBuilder } from '../test-utils'
import type { MockRepository } from '../test-utils'
import { NotFoundException } from '@nestjs/common'

describe('TrainingVideoService', () => {
  let service: TrainingVideoService
  let videoRepo: MockRepository
  let chapterRepo: MockRepository

  const mockVideo = {
    id: 1,
    title: 'Test Video',
    description: 'desc',
    fileUrl: 'https://example.com/video.mp4',
    coverUrl: null,
    duration: 600,
    fileSize: 1024000,
    format: 'mp4',
    categoryId: 1,
    sortOrder: 0,
    isPublished: false,
    uploadedById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  beforeEach(async () => {
    videoRepo = createMockRepository()
    chapterRepo = createMockRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingVideoService,
        { provide: getRepositoryToken(TrainingVideo), useValue: videoRepo },
        { provide: getRepositoryToken(VideoChapter), useValue: chapterRepo },
      ],
    }).compile()

    service = module.get(TrainingVideoService)
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const qb = createMockQueryBuilder([mockVideo], 1)
      videoRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 10 })
      expect(result.list).toEqual([mockVideo])
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('should filter by categoryId', async () => {
      const qb = createMockQueryBuilder([], 0)
      videoRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ categoryId: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('v.category_id = :categoryId', { categoryId: 1 })
    })

    it('should filter by keyword', async () => {
      const qb = createMockQueryBuilder([], 0)
      videoRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ keyword: 'test' })
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(v.title LIKE :kw OR v.description LIKE :kw)',
        { kw: '%test%' },
      )
    })

    it('should filter by isPublished', async () => {
      const qb = createMockQueryBuilder([], 0)
      videoRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ isPublished: true })
      expect(qb.andWhere).toHaveBeenCalledWith('v.is_published = :isPublished', { isPublished: true })
    })
  })

  describe('findOne', () => {
    it('should return video with relations', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      const result = await service.findOne(1)
      expect(result).toEqual(mockVideo)
    })

    it('should throw NotFoundException', async () => {
      videoRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('should create and save video', async () => {
      videoRepo.create.mockReturnValue(mockVideo)
      videoRepo.save.mockResolvedValue(mockVideo)

      const result = await service.create({
        title: 'Test Video',
        fileUrl: 'https://example.com/video.mp4',
        duration: 600,
        fileSize: 1024000,
        format: 'mp4',
        categoryId: 1,
      }, 1)

      expect(videoRepo.create).toHaveBeenCalled()
      expect(videoRepo.save).toHaveBeenCalled()
      expect(result).toEqual(mockVideo)
    })
  })

  describe('update', () => {
    it('should update video', async () => {
      videoRepo.findOne.mockResolvedValue({ ...mockVideo })
      videoRepo.save.mockResolvedValue({ ...mockVideo, title: 'Updated' })

      const result = await service.update(1, { title: 'Updated' })
      expect(videoRepo.save).toHaveBeenCalled()
      expect(result.title).toBe('Updated')
    })
  })

  describe('remove', () => {
    it('should soft remove video', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      videoRepo.softRemove.mockResolvedValue(mockVideo)

      await service.remove(1)
      expect(videoRepo.softRemove).toHaveBeenCalledWith(mockVideo)
    })
  })

  describe('togglePublish', () => {
    it('should toggle isPublished from false to true', async () => {
      const video = { ...mockVideo, isPublished: false }
      videoRepo.findOne.mockResolvedValue(video)
      videoRepo.save.mockResolvedValue({ ...video, isPublished: true })

      const result = await service.togglePublish(1)
      expect(result.isPublished).toBe(true)
    })

    it('should toggle isPublished from true to false', async () => {
      const video = { ...mockVideo, isPublished: true }
      videoRepo.findOne.mockResolvedValue(video)
      videoRepo.save.mockResolvedValue({ ...video, isPublished: false })

      const result = await service.togglePublish(1)
      expect(result.isPublished).toBe(false)
    })
  })

  describe('chapters', () => {
    const mockChapter = { id: 1, videoId: 1, title: 'Ch1', startTime: 0, sortOrder: 0 }

    it('should find chapters for video', async () => {
      chapterRepo.find.mockResolvedValue([mockChapter])
      const result = await service.findChapters(1)
      expect(result).toEqual([mockChapter])
    })

    it('should create chapter', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      chapterRepo.create.mockReturnValue(mockChapter)
      chapterRepo.save.mockResolvedValue(mockChapter)

      const result = await service.createChapter(1, { title: 'Ch1', startTime: 0 })
      expect(result).toEqual(mockChapter)
    })

    it('should throw when creating chapter for nonexistent video', async () => {
      videoRepo.findOne.mockResolvedValue(null)
      await expect(service.createChapter(999, { title: 'Ch1', startTime: 0 })).rejects.toThrow(NotFoundException)
    })

    it('should remove chapter', async () => {
      chapterRepo.findOne.mockResolvedValue(mockChapter)
      chapterRepo.softRemove.mockResolvedValue(mockChapter)
      await service.removeChapter(1)
      expect(chapterRepo.softRemove).toHaveBeenCalled()
    })

    it('should throw when removing nonexistent chapter', async () => {
      chapterRepo.findOne.mockResolvedValue(null)
      await expect(service.removeChapter(999)).rejects.toThrow(NotFoundException)
    })
  })
})
