import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { PkService } from '../../src/modules/pk/pk.service'
import { PkBadgeService } from '../../src/modules/pk/pk-badge.service'
import { Pk } from '../../src/modules/pk/pk.entity'
import { PkTeam } from '../../src/modules/pk/pk-team.entity'
import { PkMember } from '../../src/modules/pk/pk-member.entity'
import { PkBadge } from '../../src/modules/pk/pk-badge.entity'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { Payment } from '../../src/modules/payment/entities/payment.entity'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'
import { RedisService } from '../../src/common/redis/redis.service'
import { PkStatus, PkMetric, PkResult, PkType, OpportunityStage } from '@crm/shared'

describe('PkService', () => {
  let service: PkService
  let pkRepo: MockRepository
  let teamRepo: MockRepository
  let memberRepo: MockRepository
  let badgeRepo: MockRepository
  let oppRepo: MockRepository
  let customerRepo: MockRepository
  let callRecordRepo: MockRepository
  let paymentRepo: MockRepository
  let redis: MockRedisService
  let badgeService: { awardBadges: jest.Mock }

  beforeEach(async () => {
    pkRepo = createMockRepository()
    teamRepo = createMockRepository()
    memberRepo = createMockRepository()
    badgeRepo = createMockRepository()
    oppRepo = createMockRepository()
    customerRepo = createMockRepository()
    callRecordRepo = createMockRepository()
    paymentRepo = createMockRepository()
    redis = createMockRedisService()
    badgeService = { awardBadges: jest.fn().mockResolvedValue([]) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PkService,
        { provide: getRepositoryToken(Pk), useValue: pkRepo },
        { provide: getRepositoryToken(PkTeam), useValue: teamRepo },
        { provide: getRepositoryToken(PkMember), useValue: memberRepo },
        { provide: getRepositoryToken(PkBadge), useValue: badgeRepo },
        { provide: getRepositoryToken(Opportunity), useValue: oppRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: RedisService, useValue: redis },
        { provide: PkBadgeService, useValue: badgeService },
      ],
    }).compile()

    service = module.get<PkService>(PkService)
  })

  const makePk = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 1,
    title: 'Test PK',
    type: PkType.ONE_ON_ONE,
    status: PkStatus.PENDING,
    metric: PkMetric.REVENUE,
    startDate: new Date('2025-03-01'),
    endDate: new Date('2025-03-31'),
    stake: null,
    result: null,
    createdById: 1,
    teams: [
      { id: 1, name: 'A队', side: 'A', score: 0, isWinner: false, members: [{ id: 1, userId: 1, contribution: 0 }] },
      { id: 2, name: 'B队', side: 'B', score: 0, isWinner: false, members: [{ id: 2, userId: 2, contribution: 0 }] },
    ],
    ...overrides,
  })

  describe('create', () => {
    it('should create a PK with teams and members', async () => {
      const dto = {
        title: 'New PK',
        type: PkType.ONE_ON_ONE,
        metric: PkMetric.REVENUE,
        startDate: '2025-03-01T00:00:00Z',
        endDate: '2025-03-31T00:00:00Z',
        teams: [
          { name: 'A队', side: 'A', memberIds: [1] },
          { name: 'B队', side: 'B', memberIds: [2] },
        ],
      }

      pkRepo.create.mockReturnValue({ id: 1 })
      pkRepo.save.mockResolvedValue({ id: 1 })
      teamRepo.create.mockReturnValue({ id: 1 })
      teamRepo.save.mockResolvedValue({ id: 1 })
      memberRepo.create.mockReturnValue({ id: 1 })
      memberRepo.save.mockResolvedValue([{ id: 1 }])
      pkRepo.findOne.mockResolvedValue(makePk())

      const result = await service.create(dto, 1)
      expect(pkRepo.create).toHaveBeenCalled()
      expect(pkRepo.save).toHaveBeenCalled()
      expect(teamRepo.save).toHaveBeenCalledTimes(2)
      expect(result).toBeDefined()
    })
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const qb = createMockQueryBuilder([makePk()], 1)
      pkRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: '1', pageSize: '10' })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder([], 0)
      pkRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ status: PkStatus.ACTIVE })
      expect(qb.andWhere).toHaveBeenCalledWith('pk.status = :status', { status: PkStatus.ACTIVE })
    })
  })

  describe('findOne', () => {
    it('should return PK by id', async () => {
      pkRepo.findOne.mockResolvedValue(makePk())
      const result = await service.findOne(1)
      expect(result).toBeDefined()
      expect(result.id).toBe(1)
    })

    it('should throw NotFoundException when not found', async () => {
      pkRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should soft remove PK', async () => {
      pkRepo.findOne.mockResolvedValue(makePk())
      pkRepo.softRemove.mockResolvedValue(undefined)
      await service.remove(1)
      expect(pkRepo.softRemove).toHaveBeenCalled()
    })
  })

  describe('start', () => {
    it('should start a pending PK', async () => {
      const pk = makePk({ status: PkStatus.PENDING })
      pkRepo.findOne.mockResolvedValue(pk)
      pkRepo.save.mockResolvedValue({ ...pk, status: PkStatus.ACTIVE })

      const result = await service.start(1)
      expect(result.status).toBe(PkStatus.ACTIVE)
    })

    it('should throw if PK is not pending', async () => {
      pkRepo.findOne.mockResolvedValue(makePk({ status: PkStatus.ACTIVE }))
      await expect(service.start(1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('settle', () => {
    it('should settle an active PK', async () => {
      const pk = makePk({ status: PkStatus.ACTIVE })
      pkRepo.findOne.mockResolvedValue(pk)
      redis.safeGet.mockResolvedValue(null)

      // Mock calculateScore internals
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ total: '1000' })
      oppRepo.createQueryBuilder.mockReturnValue(qb)

      memberRepo.save.mockResolvedValue(undefined)
      teamRepo.save.mockResolvedValue(undefined)
      redis.set.mockResolvedValue(undefined)
      memberRepo.find.mockResolvedValue([])

      // After calculateScore, reload returns updated pk
      const updatedPk = makePk({
        status: PkStatus.ACTIVE,
        teams: [
          { id: 1, name: 'A队', side: 'A', score: 1000, isWinner: false, members: [{ id: 1, userId: 1, contribution: 1000 }] },
          { id: 2, name: 'B队', side: 'B', score: 500, isWinner: false, members: [{ id: 2, userId: 2, contribution: 500 }] },
        ],
      })
      pkRepo.findOne
        .mockResolvedValueOnce(pk) // start: findOne
        .mockResolvedValueOnce(updatedPk) // after calculateScore
        .mockResolvedValueOnce({ ...updatedPk, status: PkStatus.FINISHED, result: PkResult.TEAM_A_WIN }) // final

      pkRepo.save.mockResolvedValue(undefined)

      const result = await service.settle(1)
      expect(pkRepo.save).toHaveBeenCalled()
    })

    it('should throw if PK is not active', async () => {
      pkRepo.findOne.mockResolvedValue(makePk({ status: PkStatus.PENDING }))
      await expect(service.settle(1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('calculateScore', () => {
    it('should use cached result if available', async () => {
      redis.safeGet.mockResolvedValue('1')
      await service.calculateScore(1)
      expect(pkRepo.findOne).not.toHaveBeenCalled()
    })

    it('should calculate revenue metric', async () => {
      redis.safeGet.mockResolvedValue(null)
      pkRepo.findOne.mockResolvedValue(makePk({ metric: PkMetric.REVENUE }))

      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ total: '5000' })
      oppRepo.createQueryBuilder.mockReturnValue(qb)

      memberRepo.save.mockResolvedValue(undefined)
      teamRepo.save.mockResolvedValue(undefined)

      await service.calculateScore(1)
      expect(oppRepo.createQueryBuilder).toHaveBeenCalled()
      expect(redis.set).toHaveBeenCalledWith('cache:pk:score:1', '1', 60)
    })

    it('should calculate deal_count metric', async () => {
      redis.safeGet.mockResolvedValue(null)
      pkRepo.findOne.mockResolvedValue(makePk({ metric: PkMetric.DEAL_COUNT }))

      const qb = createMockQueryBuilder()
      qb.getCount.mockResolvedValue(3)
      oppRepo.createQueryBuilder.mockReturnValue(qb)

      memberRepo.save.mockResolvedValue(undefined)
      teamRepo.save.mockResolvedValue(undefined)

      await service.calculateScore(1)
      expect(oppRepo.createQueryBuilder).toHaveBeenCalled()
    })

    it('should calculate call_count metric', async () => {
      redis.safeGet.mockResolvedValue(null)
      pkRepo.findOne.mockResolvedValue(makePk({ metric: PkMetric.CALL_COUNT }))

      const qb = createMockQueryBuilder()
      qb.getCount.mockResolvedValue(10)
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      memberRepo.save.mockResolvedValue(undefined)
      teamRepo.save.mockResolvedValue(undefined)

      await service.calculateScore(1)
      expect(callRecordRepo.createQueryBuilder).toHaveBeenCalled()
    })

    it('should calculate new_customer metric', async () => {
      redis.safeGet.mockResolvedValue(null)
      pkRepo.findOne.mockResolvedValue(makePk({ metric: PkMetric.NEW_CUSTOMER }))

      const qb = createMockQueryBuilder()
      qb.getCount.mockResolvedValue(5)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      memberRepo.save.mockResolvedValue(undefined)
      teamRepo.save.mockResolvedValue(undefined)

      await service.calculateScore(1)
      expect(customerRepo.createQueryBuilder).toHaveBeenCalled()
    })

    it('should calculate collection metric', async () => {
      redis.safeGet.mockResolvedValue(null)
      pkRepo.findOne.mockResolvedValue(makePk({ metric: PkMetric.COLLECTION }))

      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ total: '8000' })
      paymentRepo.createQueryBuilder.mockReturnValue(qb)

      memberRepo.save.mockResolvedValue(undefined)
      teamRepo.save.mockResolvedValue(undefined)

      await service.calculateScore(1)
      expect(paymentRepo.createQueryBuilder).toHaveBeenCalled()
    })
  })

  describe('getRanking', () => {
    it('should return members sorted by contribution', async () => {
      const members = [
        { id: 1, userId: 1, contribution: 1000 },
        { id: 2, userId: 2, contribution: 500 },
      ]
      memberRepo.find.mockResolvedValue(members)

      const result = await service.getRanking(1)
      expect(result).toHaveLength(2)
      expect(memberRepo.find).toHaveBeenCalledWith({
        where: { pkId: 1 },
        relations: ['user', 'team'],
        order: { contribution: 'DESC' },
      })
    })
  })

  describe('getMyStats', () => {
    it('should return win/loss/draw stats', async () => {
      memberRepo.find.mockResolvedValue([
        { team: { isWinner: true, pk: { status: PkStatus.FINISHED, result: PkResult.TEAM_A_WIN } } },
        { team: { isWinner: false, pk: { status: PkStatus.FINISHED, result: PkResult.TEAM_A_WIN } } },
        { team: { isWinner: false, pk: { status: PkStatus.FINISHED, result: PkResult.DRAW } } },
        { team: { pk: { status: PkStatus.ACTIVE } } }, // not counted
      ])

      const result = await service.getMyStats(1)
      expect(result.wins).toBe(1)
      expect(result.losses).toBe(1)
      expect(result.draws).toBe(1)
      expect(result.total).toBe(3)
    })

    it('should return zeros for user with no PK history', async () => {
      memberRepo.find.mockResolvedValue([])
      const result = await service.getMyStats(1)
      expect(result).toEqual({ wins: 0, losses: 0, draws: 0, total: 0 })
    })
  })

  describe('getHistory', () => {
    it('should return finished PKs', async () => {
      pkRepo.findAndCount.mockResolvedValue([[makePk({ status: PkStatus.FINISHED })], 1])
      const result = await service.getHistory({})
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('getScore', () => {
    it('should calculate and return PK', async () => {
      redis.safeGet.mockResolvedValue('1') // cached
      pkRepo.findOne.mockResolvedValue(makePk())
      const result = await service.getScore(1)
      expect(result).toBeDefined()
    })
  })
})
