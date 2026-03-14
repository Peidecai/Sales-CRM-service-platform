import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { CampaignService } from '../../src/modules/campaign/campaign.service'
import { CampaignTask, CampaignTaskStatus } from '../../src/modules/campaign/entities/campaign-task.entity'
import { CampaignCallItem, CampaignCallStatus } from '../../src/modules/campaign/entities/campaign-call-item.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'

const testUser: AuthUser = { id: 1, username: 'sales1', role: UserRole.SALES }
const otherUser: AuthUser = { id: 99, username: 'other', role: UserRole.SALES }

describe('CampaignService', () => {
  let service: CampaignService
  let taskRepo: MockRepository<CampaignTask>
  let itemRepo: MockRepository<CampaignCallItem>

  beforeEach(async () => {
    taskRepo = createMockRepository<CampaignTask>()
    itemRepo = createMockRepository<CampaignCallItem>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: getRepositoryToken(CampaignTask), useValue: taskRepo },
        { provide: getRepositoryToken(CampaignCallItem), useValue: itemRepo },
      ],
    }).compile()

    service = module.get<CampaignService>(CampaignService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    it('should create campaign with customerIds and save call items', async () => {
      const saved = fixtures.campaignTask({ totalCount: 2 })
      taskRepo.create.mockReturnValue(saved)
      taskRepo.save.mockResolvedValue(saved)
      itemRepo.create.mockImplementation((dto) => dto)
      itemRepo.save.mockImplementation(async (item) => item)

      const result = await service.create(
        { name: 'Test Campaign', customerIds: [10, 20] },
        testUser,
      )

      expect(taskRepo.create).toHaveBeenCalledWith({
        name: 'Test Campaign',
        status: CampaignTaskStatus.DRAFT,
        totalCount: 2,
        createdBy: testUser.id,
      })
      expect(taskRepo.save).toHaveBeenCalledWith(saved)
      expect(itemRepo.save).toHaveBeenCalledTimes(2)
      expect(result.name).toBe('Test Campaign')
    })

    it('should create campaign without customerIds (empty list)', async () => {
      const saved = fixtures.campaignTask()
      taskRepo.create.mockReturnValue(saved)
      taskRepo.save.mockResolvedValue(saved)

      const result = await service.create({ name: 'Empty Campaign' }, testUser)

      expect(taskRepo.create).toHaveBeenCalledWith({
        name: 'Empty Campaign',
        status: CampaignTaskStatus.DRAFT,
        totalCount: 0,
        createdBy: testUser.id,
      })
      expect(itemRepo.save).not.toHaveBeenCalled()
      expect(result).toEqual(saved)
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return paginated list with default page/pageSize', async () => {
      const tasks = [fixtures.campaignTask()]
      const qb = createMockQueryBuilder(tasks, 1)
      taskRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({}, testUser)

      expect(qb.where).toHaveBeenCalledWith('t.createdBy = :uid', { uid: testUser.id })
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result).toEqual({ list: tasks, total: 1, page: 1, pageSize: 20 })
    })

    it('should apply status filter when provided', async () => {
      const qb = createMockQueryBuilder([], 0)
      taskRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ status: CampaignTaskStatus.RUNNING, page: 2, pageSize: 10 }, testUser)

      expect(qb.andWhere).toHaveBeenCalledWith('t.status = :status', { status: CampaignTaskStatus.RUNNING })
      expect(qb.skip).toHaveBeenCalledWith(10) // (2-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return campaign when found and owned by user', async () => {
      const task = fixtures.campaignTask()
      taskRepo.findOne.mockResolvedValue(task)

      const result = await service.findOne(1, testUser)

      expect(result).toEqual(task)
      expect(taskRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should throw NotFoundException when campaign not found', async () => {
      taskRepo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999, testUser)).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when user does not own campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask({ createdBy: 1 }))

      await expect(service.findOne(1, otherUser)).rejects.toThrow(BadRequestException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update name when campaign is in DRAFT status', async () => {
      const task = fixtures.campaignTask()
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.save.mockImplementation(async (t) => t)

      const result = await service.update(1, { name: 'Updated' }, testUser)

      expect(result.name).toBe('Updated')
      expect(taskRepo.save).toHaveBeenCalled()
    })

    it('should throw BadRequestException when editing non-draft campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask({ status: CampaignTaskStatus.RUNNING }))

      await expect(service.update(1, { name: 'X' }, testUser)).rejects.toThrow(BadRequestException)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should delete draft campaign', async () => {
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.DRAFT })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.remove.mockResolvedValue(task)

      await service.remove(1, testUser)

      expect(taskRepo.remove).toHaveBeenCalledWith(task)
    })

    it('should delete cancelled campaign', async () => {
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.CANCELLED })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.remove.mockResolvedValue(task)

      await service.remove(1, testUser)

      expect(taskRepo.remove).toHaveBeenCalledWith(task)
    })

    it('should throw BadRequestException when deleting running campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask({ status: CampaignTaskStatus.RUNNING }))

      await expect(service.remove(1, testUser)).rejects.toThrow(BadRequestException)
    })
  })

  /* ---------- state transitions (start / pause / resume / stop) ---------- */
  describe('start', () => {
    it('should start a DRAFT campaign and set startedAt', async () => {
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.DRAFT, startedAt: null })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.save.mockImplementation(async (t) => t)

      await service.start(1, testUser)

      expect(task.status).toBe(CampaignTaskStatus.RUNNING)
      expect(task.startedAt).toBeInstanceOf(Date)
      expect(taskRepo.save).toHaveBeenCalledWith(task)
    })

    it('should start a PAUSED campaign without overwriting startedAt', async () => {
      const originalStart = new Date('2025-06-01')
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.PAUSED, startedAt: originalStart })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.save.mockImplementation(async (t) => t)

      await service.start(1, testUser)

      expect(task.status).toBe(CampaignTaskStatus.RUNNING)
      expect(task.startedAt).toBe(originalStart)
    })

    it('should throw BadRequestException when starting a COMPLETED campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask({ status: CampaignTaskStatus.COMPLETED }))

      await expect(service.start(1, testUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('pause', () => {
    it('should pause a RUNNING campaign', async () => {
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.RUNNING })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.save.mockImplementation(async (t) => t)

      await service.pause(1, testUser)

      expect(task.status).toBe(CampaignTaskStatus.PAUSED)
    })

    it('should throw when pausing a non-running campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask({ status: CampaignTaskStatus.DRAFT }))

      await expect(service.pause(1, testUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('resume', () => {
    it('should resume a PAUSED campaign', async () => {
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.PAUSED })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.save.mockImplementation(async (t) => t)

      await service.resume(1, testUser)

      expect(task.status).toBe(CampaignTaskStatus.RUNNING)
    })

    it('should throw when resuming a non-paused campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask({ status: CampaignTaskStatus.RUNNING }))

      await expect(service.resume(1, testUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe('stop', () => {
    it('should stop campaign and set endedAt', async () => {
      const task = fixtures.campaignTask({ status: CampaignTaskStatus.RUNNING })
      taskRepo.findOne.mockResolvedValue(task)
      taskRepo.save.mockImplementation(async (t) => t)

      await service.stop(1, testUser)

      expect(task.status).toBe(CampaignTaskStatus.COMPLETED)
      expect(task.endedAt).toBeInstanceOf(Date)
    })
  })

  /* ---------- getItems ---------- */
  describe('getItems', () => {
    it('should return paginated call items for owned campaign', async () => {
      taskRepo.findOne.mockResolvedValue(fixtures.campaignTask())

      const items = [
        fixtures.campaignCallItem({ id: 1, customerId: 10 }),
        fixtures.campaignCallItem({ id: 2, customerId: 20, callStatus: CampaignCallStatus.COMPLETED }),
      ]
      itemRepo.findAndCount.mockResolvedValue([items, 2])

      const result = await service.getItems(1, 1, 10, testUser)

      expect(result).toEqual({ list: items, total: 2, page: 1, pageSize: 10 })
      expect(itemRepo.findAndCount).toHaveBeenCalledWith({
        where: { campaignTaskId: 1 },
        order: { id: 'ASC' },
        skip: 0,
        take: 10,
      })
    })
  })
})
