import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { VideoProgressService } from '../../src/modules/training/video-progress.service'
import { VideoProgress } from '../../src/modules/training/entities/video-progress.entity'
import { TrainingVideo } from '../../src/modules/training/entities/training-video.entity'
import { createMockRepository } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('VideoProgressService', () => {
  let service: VideoProgressService
  let progressRepo: MockRepository
  let videoRepo: MockRepository

  const mockVideo = { id: 1, duration: 600 }
  const mockProgress = {
    id: 1,
    userId: 1,
    videoId: 1,
    watchedSeconds: 0,
    lastPosition: 0,
    completionRate: 0,
    isCompleted: false,
    completedAt: null,
  }

  beforeEach(async () => {
    progressRepo = createMockRepository()
    videoRepo = createMockRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProgressService,
        { provide: getRepositoryToken(VideoProgress), useValue: progressRepo },
        { provide: getRepositoryToken(TrainingVideo), useValue: videoRepo },
      ],
    }).compile()

    service = module.get(VideoProgressService)
  })

  describe('getProgress', () => {
    it('should return existing progress', async () => {
      progressRepo.findOne.mockResolvedValue(mockProgress)
      const result = await service.getProgress(1, 1)
      expect(result).toEqual(mockProgress)
    })

    it('should return null when no progress exists', async () => {
      progressRepo.findOne.mockResolvedValue(null)
      const result = await service.getProgress(1, 999)
      expect(result).toBeNull()
    })
  })

  describe('updateProgress', () => {
    it('should create new progress record', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      progressRepo.findOne.mockResolvedValue(null)
      progressRepo.create.mockReturnValue({ ...mockProgress })
      progressRepo.save.mockImplementation(async (p) => p)

      const result = await service.updateProgress(1, 1, { watchedSeconds: 300, lastPosition: 300 })
      expect(result.watchedSeconds).toBe(300)
      expect(result.completionRate).toBe(50)
    })

    it('should update existing progress', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      progressRepo.findOne.mockResolvedValue({ ...mockProgress })
      progressRepo.save.mockImplementation(async (p) => p)

      const result = await service.updateProgress(1, 1, { watchedSeconds: 200, lastPosition: 200 })
      expect(result.watchedSeconds).toBe(200)
    })

    it('should auto-complete at 90%', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      progressRepo.findOne.mockResolvedValue({ ...mockProgress })
      progressRepo.save.mockImplementation(async (p) => p)

      const result = await service.updateProgress(1, 1, { watchedSeconds: 540, lastPosition: 540 })
      expect(result.isCompleted).toBe(true)
      expect(result.completedAt).toBeInstanceOf(Date)
    })

    it('should not re-complete already completed', async () => {
      const completed = { ...mockProgress, isCompleted: true, completedAt: new Date('2025-01-01') }
      videoRepo.findOne.mockResolvedValue(mockVideo)
      progressRepo.findOne.mockResolvedValue(completed)
      progressRepo.save.mockImplementation(async (p) => p)

      const result = await service.updateProgress(1, 1, { watchedSeconds: 600, lastPosition: 600 })
      expect(result.completedAt).toEqual(new Date('2025-01-01'))
    })

    it('should throw if video not found', async () => {
      videoRepo.findOne.mockResolvedValue(null)
      await expect(service.updateProgress(1, 999, { watchedSeconds: 0, lastPosition: 0 })).rejects.toThrow()
    })

    it('should cap completionRate at 100', async () => {
      videoRepo.findOne.mockResolvedValue(mockVideo)
      progressRepo.findOne.mockResolvedValue({ ...mockProgress })
      progressRepo.save.mockImplementation(async (p) => p)

      const result = await service.updateProgress(1, 1, { watchedSeconds: 700, lastPosition: 700 })
      expect(result.completionRate).toBeLessThanOrEqual(100)
    })
  })

  describe('getUserStats', () => {
    it('should calculate total watch time and completed count', async () => {
      progressRepo.find.mockResolvedValue([
        { ...mockProgress, watchedSeconds: 300, isCompleted: true },
        { ...mockProgress, id: 2, videoId: 2, watchedSeconds: 200, isCompleted: false },
      ])

      const stats = await service.getUserStats(1)
      expect(stats.totalWatchTime).toBe(500)
      expect(stats.completedCount).toBe(1)
    })

    it('should return zeros for user with no progress', async () => {
      progressRepo.find.mockResolvedValue([])
      const stats = await service.getUserStats(999)
      expect(stats.totalWatchTime).toBe(0)
      expect(stats.completedCount).toBe(0)
    })
  })
})
