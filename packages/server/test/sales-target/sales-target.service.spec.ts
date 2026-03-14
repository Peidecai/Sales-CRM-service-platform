import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { SalesTargetService } from '../../src/modules/sales-target/sales-target.service'
import { SalesTarget } from '../../src/modules/sales-target/sales-target.entity'
import { PerformanceRanking } from '../../src/modules/sales-target/performance-ranking.entity'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { User } from '../../src/modules/user/user.entity'
import { RedisService } from '../../src/common/redis'
import {
  TargetScope,
  TargetPeriod,
  TargetMetricType,
  UserRole,
} from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockRedisService,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

/* ---------- Shared fixtures ---------- */

const adminUser: AuthUser = { id: 2, username: 'admin', role: UserRole.ADMIN }
const salesUser: AuthUser = { id: 1, username: 'sales1', role: UserRole.SALES }

function makeSalesTarget(overrides: Record<string, unknown> = {}): SalesTarget {
  return {
    id: 1,
    name: 'Q1 Revenue Target',
    scope: TargetScope.COMPANY,
    period: TargetPeriod.QUARTER,
    metricType: TargetMetricType.REVENUE,
    targetValue: 1000000,
    achievedValue: 400000,
    year: 2025,
    quarter: 1,
    month: null,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    assignedUserId: null,
    teamId: null,
    parentTargetId: null,
    parent: null,
    children: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  } as unknown as SalesTarget
}

describe('SalesTargetService', () => {
  let service: SalesTargetService
  let targetRepo: MockRepository<SalesTarget>
  let rankingRepo: MockRepository<PerformanceRanking>
  let opportunityRepo: MockRepository<Opportunity>
  let customerRepo: MockRepository<Customer>
  let callRecordRepo: MockRepository<CallRecord>
  let userRepo: MockRepository<User>
  let redis: MockRedisService

  beforeEach(async () => {
    targetRepo = createMockRepository<SalesTarget>()
    rankingRepo = createMockRepository<PerformanceRanking>()
    opportunityRepo = createMockRepository<Opportunity>()
    customerRepo = createMockRepository<Customer>()
    callRecordRepo = createMockRepository<CallRecord>()
    userRepo = createMockRepository<User>()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesTargetService,
        { provide: getRepositoryToken(SalesTarget), useValue: targetRepo },
        { provide: getRepositoryToken(PerformanceRanking), useValue: rankingRepo },
        { provide: getRepositoryToken(Opportunity), useValue: opportunityRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get<SalesTargetService>(SalesTargetService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ================================================================
   * 1. create() — 正常创建目标
   * ================================================================ */
  describe('create', () => {
    const dto = {
      name: 'Q1 Revenue',
      scope: TargetScope.COMPANY,
      period: TargetPeriod.QUARTER,
      metricType: TargetMetricType.REVENUE,
      targetValue: 1000000,
      year: 2025,
      quarter: 1,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
    }

    it('should create a target with achievedValue=0 and invalidate cache', async () => {
      const target = makeSalesTarget({ ...dto, achievedValue: 0 })
      targetRepo.create.mockReturnValue(target)
      targetRepo.save.mockResolvedValue(target)

      const result = await service.create(dto as never)

      expect(targetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ achievedValue: 0 }),
      )
      expect(targetRepo.save).toHaveBeenCalled()
      expect(redis.delByPattern).toHaveBeenCalledWith(
        expect.stringContaining('sales-targets:stats'),
      )
      expect(result.name).toBe('Q1 Revenue')
    })

    /* ================================================================
     * 2. create() — scope=team 时 userId 可以为空
     * ================================================================ */
    it('should allow creating a team target without assignedUserId', async () => {
      const teamDto = { ...dto, scope: TargetScope.TEAM, teamId: 'team-01', assignedUserId: null }
      const target = makeSalesTarget({ ...teamDto, achievedValue: 0 })
      targetRepo.create.mockReturnValue(target)
      targetRepo.save.mockResolvedValue(target)

      const result = await service.create(teamDto as never)

      expect(targetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ scope: TargetScope.TEAM, achievedValue: 0 }),
      )
      expect(result.assignedUserId).toBeNull()
    })
  })

  /* ================================================================
   * 3. create() — decompose 分解超出父目标 → BadRequestException
   * ================================================================ */
  describe('decompose', () => {
    it('should throw BadRequestException when total exceeds parent target value', async () => {
      const parent = makeSalesTarget({ id: 1, targetValue: 100000, scope: TargetScope.COMPANY })
      targetRepo.findOne.mockResolvedValue(parent)

      const dto = {
        items: [
          { targetValue: 60000, teamId: 'team-01' },
          { targetValue: 60000, teamId: 'team-02' },
        ],
      }

      await expect(service.decompose(1, dto as never)).rejects.toThrow(BadRequestException)
    })

    /* ================================================================
     * 13. decomposeTarget() — 正常分解
     * ================================================================ */
    it('should decompose parent target into children with correct scope', async () => {
      const parent = makeSalesTarget({
        id: 1,
        targetValue: 100000,
        scope: TargetScope.COMPANY,
        period: TargetPeriod.QUARTER,
        metricType: TargetMetricType.REVENUE,
        year: 2025,
        quarter: 1,
      })
      targetRepo.findOne.mockResolvedValue(parent)

      const children = [
        makeSalesTarget({ id: 10, scope: TargetScope.TEAM, targetValue: 50000, parentTargetId: 1 }),
        makeSalesTarget({ id: 11, scope: TargetScope.TEAM, targetValue: 50000, parentTargetId: 1 }),
      ]
      targetRepo.create.mockReturnValueOnce(children[0]).mockReturnValueOnce(children[1])
      targetRepo.save.mockResolvedValue(children)

      const dto = {
        items: [
          { targetValue: 50000, teamId: 'team-01' },
          { targetValue: 50000, teamId: 'team-02' },
        ],
      }

      const result = await service.decompose(1, dto as never)

      expect(targetRepo.create).toHaveBeenCalledTimes(2)
      expect(targetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: TargetScope.TEAM,
          parentTargetId: 1,
          achievedValue: 0,
        }),
      )
      expect(redis.delByPattern).toHaveBeenCalled()
      expect(result).toHaveLength(2)
    })
  })

  /* ================================================================
   * 4. findAll() — 正常分页
   * 5. findAll() — SALES 用户 userId 限制
   * ================================================================ */
  describe('findAll', () => {
    it('should return paginated list with default page and pageSize', async () => {
      const targets = [makeSalesTarget()]
      const qb = createMockQueryBuilder(targets, 1)
      targetRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({} as never, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('should restrict SALES user to own individual targets + company/team targets', async () => {
      const qb = createMockQueryBuilder([], 0)
      targetRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({} as never, salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(target.scope != :indScope OR target.assignedUserId = :uid)',
        { indScope: TargetScope.INDIVIDUAL, uid: salesUser.id },
      )
    })
  })

  /* ================================================================
   * 6. findOne() — 正常返回
   * 7. findOne() — 不存在 → NotFoundException
   * ================================================================ */
  describe('findOne', () => {
    it('should return target with children relation', async () => {
      const target = makeSalesTarget()
      targetRepo.findOne.mockResolvedValue(target)

      const result = await service.findOne(1)

      expect(targetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['children'],
      })
      expect(result.name).toBe('Q1 Revenue Target')
    })

    it('should throw NotFoundException when target does not exist', async () => {
      targetRepo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when SALES user accesses another user individual target', async () => {
      const target = makeSalesTarget({
        scope: TargetScope.INDIVIDUAL,
        assignedUserId: 99,
      })
      targetRepo.findOne.mockResolvedValue(target)

      await expect(service.findOne(1, salesUser)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ================================================================
   * 8. update() — 正常更新
   * 9. update() — 不存在时抛出异常
   * ================================================================ */
  describe('update', () => {
    it('should update target fields and invalidate cache', async () => {
      const target = makeSalesTarget()
      targetRepo.findOne.mockResolvedValue({ ...target })
      targetRepo.save.mockImplementation(async (t) => t)

      const result = await service.update(1, { name: 'Updated Target' } as never)

      expect(result.name).toBe('Updated Target')
      expect(redis.delByPattern).toHaveBeenCalledWith(
        expect.stringContaining('sales-targets:stats'),
      )
    })

    it('should throw NotFoundException when updating non-existent target', async () => {
      targetRepo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { name: 'X' } as never)).rejects.toThrow(NotFoundException)
    })
  })

  /* ================================================================
   * 10. remove() — 正常软删除
   * ================================================================ */
  describe('remove', () => {
    it('should soft-delete target and invalidate cache', async () => {
      const target = makeSalesTarget()
      targetRepo.findOne.mockResolvedValue(target)
      targetRepo.softRemove.mockResolvedValue(target)

      await service.remove(1)

      expect(targetRepo.softRemove).toHaveBeenCalledWith(target)
      expect(redis.delByPattern).toHaveBeenCalledWith(
        expect.stringContaining('sales-targets:stats'),
      )
    })
  })

  /* ================================================================
   * 11. getAchievement() — 正确计算达成率
   * ================================================================ */
  describe('getAchievement', () => {
    it('should calculate achievement rate, remaining value and daily required', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-02-15'))

      const target = makeSalesTarget({
        targetValue: 1000000,
        achievedValue: 400000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
      })
      targetRepo.findOne.mockResolvedValue(target)

      const result = await service.getAchievement(1)

      expect(result.achievementRate).toBe(40) // 400000/1000000 * 100
      expect(result.remainingValue).toBe(600000)
      expect(result.daysLeft).toBe(44) // Feb 15 → Mar 31 = 44 days
      expect(result.dailyRequired).toBeCloseTo(600000 / 44, 2)
      expect(result.target).toBeDefined()

      jest.useRealTimers()
    })
  })

  /* ================================================================
   * 12. getForecast() — 正确预测
   * ================================================================ */
  describe('getForecast', () => {
    it('should compute linear forecast and determine onTrack status', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-02-15'))

      const target = makeSalesTarget({
        targetValue: 1000000,
        achievedValue: 600000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
      })
      targetRepo.findOne.mockResolvedValue(target)

      const result = await service.getForecast(1)

      // elapsed ~45 days (Jan1→Feb15), total ~89 days (Jan1→Mar31)
      // dailyRate = 600000/45 ≈ 13333.33
      // forecastValue = dailyRate * 89 ≈ 1186666.67
      // forecastRate = (forecastValue / 1000000) * 100 ≈ 118.67
      expect(result.achievementRate).toBe(60)
      expect(result.forecastValue).toBeGreaterThan(1000000)
      expect(result.forecastRate).toBeGreaterThan(100)
      expect(result.onTrack).toBe(true)

      jest.useRealTimers()
    })
  })

  /* ================================================================
   * 14. getSalesRanking() — 正确查询排行
   * ================================================================ */
  describe('getSalesRanking', () => {
    it('should query rankings filtered by metricType, period, year and ordered by rank', async () => {
      const rankings = [
        { id: 1, userId: 1, userName: 'Alice', rank: 1, metricValue: 500000 },
        { id: 2, userId: 2, userName: 'Bob', rank: 2, metricValue: 300000 },
      ]
      const qb = createMockQueryBuilder(rankings, 2)
      rankingRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getSalesRanking(
        TargetMetricType.REVENUE,
        TargetPeriod.MONTH,
        2025,
        1,
        3,
        10,
      )

      expect(qb.where).toHaveBeenCalledWith('r.period = :period', { period: TargetPeriod.MONTH })
      expect(qb.andWhere).toHaveBeenCalledWith('r.metricType = :metricType', {
        metricType: TargetMetricType.REVENUE,
      })
      expect(qb.andWhere).toHaveBeenCalledWith('r.year = :year', { year: 2025 })
      expect(qb.andWhere).toHaveBeenCalledWith('r.quarter = :quarter', { quarter: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('r.month = :month', { month: 3 })
      expect(qb.orderBy).toHaveBeenCalledWith('r.rank', 'ASC')
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(result).toHaveLength(2)
    })
  })

  /* ================================================================
   * 15. snapshotRankings() — 正确生成排行快照
   * ================================================================ */
  describe('snapshotRankings', () => {
    it('should create ranking snapshots for all metric types and active users', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-03-15'))

      const users = [
        { id: 1, name: 'Alice', isActive: true },
        { id: 2, name: 'Bob', isActive: true },
      ]
      userRepo.find.mockResolvedValue(users)

      // No existing snapshot for today
      rankingRepo.findOne.mockResolvedValue(null)

      // All computeUserMetric calls return 0 for simplicity
      const oppQb = createMockQueryBuilder([], 0)
      oppQb.getRawOne.mockResolvedValue({ total: '0' })
      opportunityRepo.createQueryBuilder.mockReturnValue(oppQb)

      const custQb = createMockQueryBuilder([], 0)
      custQb.getRawOne.mockResolvedValue({ total: '0' })
      customerRepo.createQueryBuilder.mockReturnValue(custQb)

      const crQb = createMockQueryBuilder([], 0)
      crQb.getRawOne.mockResolvedValue({ total: '0' })
      callRecordRepo.createQueryBuilder.mockReturnValue(crQb)

      rankingRepo.create.mockImplementation((data) => data)
      rankingRepo.save.mockImplementation(async (data) => data)

      const created = await service.snapshotRankings()

      // 4 metric types × 2 users = 8 rankings
      expect(created).toBe(8)
      expect(rankingRepo.create).toHaveBeenCalledTimes(8)
      expect(rankingRepo.save).toHaveBeenCalledTimes(8)

      // Verify a ranking entry has correct fields
      expect(rankingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          period: TargetPeriod.MONTH,
          scope: TargetScope.COMPANY,
          year: 2025,
          quarter: 1,
          month: 3,
        }),
      )

      jest.useRealTimers()
    })
  })
})
