import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { TrainingTaskService } from '../../src/modules/training/training-task.service'
import { TrainingTask } from '../../src/modules/training/entities/training-task.entity'
import { TrainingTaskAssignee } from '../../src/modules/training/entities/training-task-assignee.entity'
import { createMockRepository, createMockQueryBuilder, createMockDataSource } from '../test-utils'
import type { MockRepository } from '../test-utils'
import { NotFoundException } from '@nestjs/common'

describe('TrainingTaskService', () => {
  let service: TrainingTaskService
  let taskRepo: MockRepository
  let assigneeRepo: MockRepository
  let mockDataSource: ReturnType<typeof createMockDataSource>

  const mockTask = {
    id: 1,
    title: 'Watch Video',
    description: null,
    videoId: 1,
    assignedById: 1,
    deadline: new Date('2025-12-31'),
    video: { id: 1, title: 'Test Video' },
    assignees: [
      { id: 1, taskId: 1, userId: 1, isCompleted: false, completedAt: null },
      { id: 2, taskId: 1, userId: 2, isCompleted: true, completedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    taskRepo = createMockRepository()
    assigneeRepo = createMockRepository()
    mockDataSource = createMockDataSource()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingTaskService,
        { provide: getRepositoryToken(TrainingTask), useValue: taskRepo },
        { provide: getRepositoryToken(TrainingTaskAssignee), useValue: assigneeRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile()

    service = module.get(TrainingTaskService)
  })

  describe('create', () => {
    it('should create task with assignees in transaction', async () => {
      const qr = mockDataSource.mockQueryRunner
      qr.manager.save.mockImplementation(async (entity: unknown) => {
        if (Array.isArray(entity)) return entity
        return { ...(entity as Record<string, unknown>), id: 1 }
      })
      taskRepo.findOne.mockResolvedValue(mockTask)

      const result = await service.create({
        title: 'Watch Video',
        videoId: 1,
        assigneeIds: [1, 2],
        deadline: new Date('2025-12-31'),
      }, 1)

      expect(qr.startTransaction).toHaveBeenCalled()
      expect(qr.commitTransaction).toHaveBeenCalled()
      expect(result).toEqual(mockTask)
    })

    it('should rollback on error', async () => {
      const qr = mockDataSource.mockQueryRunner
      qr.manager.save.mockRejectedValue(new Error('DB error'))

      await expect(service.create({
        title: 'Watch Video',
        videoId: 1,
        assigneeIds: [1],
        deadline: new Date('2025-12-31'),
      }, 1)).rejects.toThrow('DB error')

      expect(qr.rollbackTransaction).toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return paginated tasks', async () => {
      const qb = createMockQueryBuilder([mockTask], 1)
      taskRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 10 })
      expect(result.list).toEqual([mockTask])
      expect(result.total).toBe(1)
    })

    it('should filter by userId', async () => {
      const qb = createMockQueryBuilder([], 0)
      taskRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ userId: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('assignees.user_id = :userId', { userId: 1 })
    })
  })

  describe('findOne', () => {
    it('should return task with relations', async () => {
      taskRepo.findOne.mockResolvedValue(mockTask)
      const result = await service.findOne(1)
      expect(result).toEqual(mockTask)
    })

    it('should throw NotFoundException', async () => {
      taskRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('markComplete', () => {
    it('should mark assignee as completed', async () => {
      const assignee = { id: 1, taskId: 1, userId: 1, isCompleted: false, completedAt: null }
      assigneeRepo.findOne.mockResolvedValue(assignee)
      assigneeRepo.save.mockImplementation(async (a) => a)

      const result = await service.markComplete(1, 1)
      expect(result.isCompleted).toBe(true)
      expect(result.completedAt).toBeInstanceOf(Date)
    })

    it('should throw if assignee not found', async () => {
      assigneeRepo.findOne.mockResolvedValue(null)
      await expect(service.markComplete(1, 999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getStatistics', () => {
    it('should return task statistics', async () => {
      taskRepo.count.mockResolvedValue(5)
      assigneeRepo.find.mockResolvedValue([
        { isCompleted: true },
        { isCompleted: true },
        { isCompleted: false },
        { isCompleted: false },
      ])
      const qb = createMockQueryBuilder([], 0)
      qb.getCount.mockResolvedValue(2)
      taskRepo.createQueryBuilder.mockReturnValue(qb)

      const stats = await service.getStatistics()
      expect(stats.totalTasks).toBe(5)
      expect(stats.completionRate).toBe(50)
      expect(stats.overdueTasks).toBe(2)
    })

    it('should return 0 completion rate when no assignees', async () => {
      taskRepo.count.mockResolvedValue(0)
      assigneeRepo.find.mockResolvedValue([])
      const qb = createMockQueryBuilder([], 0)
      qb.getCount.mockResolvedValue(0)
      taskRepo.createQueryBuilder.mockReturnValue(qb)

      const stats = await service.getStatistics()
      expect(stats.completionRate).toBe(0)
    })
  })
})
