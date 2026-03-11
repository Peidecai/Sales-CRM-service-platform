import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { OpportunityService } from '../../src/modules/opportunity/opportunity.service'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { OpportunityStageLog } from '../../src/modules/opportunity/entities/opportunity-stage-log.entity'
import { RedisService } from '../../src/common/redis'
import { OpportunityStage, UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockRedisService,
  fixtures,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

const adminUser: AuthUser = { id: 2, username: 'admin', role: UserRole.ADMIN }
const salesUser: AuthUser = { id: 1, username: 'sales1', role: UserRole.SALES }
const otherSalesUser: AuthUser = { id: 3, username: 'sales2', role: UserRole.SALES }

describe('OpportunityService', () => {
  let service: OpportunityService
  let repo: MockRepository<Opportunity>
  let redis: MockRedisService

  beforeEach(async () => {
    repo = createMockRepository<Opportunity>()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityService,
        { provide: getRepositoryToken(Opportunity), useValue: repo },
        { provide: getRepositoryToken(OpportunityStageLog), useValue: createMockRepository() },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get<OpportunityService>(OpportunityService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      title: 'New Deal',
      customerId: 1,
      assignedUserId: 1,
      amount: 100000,
    }

    it('should create opportunity with default stage and probability', async () => {
      const opp = fixtures.opportunity({ ...dto, stage: OpportunityStage.LEAD, probability: 10 })
      repo.create.mockReturnValue(opp)
      repo.save.mockResolvedValue(opp)

      const result = await service.create(dto as never)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Deal',
        stage: OpportunityStage.LEAD,
        probability: 10,
      }))
      expect(repo.save).toHaveBeenCalled()
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:opportunities:stats:*')
      expect(result.title).toBe('New Deal')
    })

    it('should use provided stage and calculate probability', async () => {
      const dtoWithStage = { ...dto, stage: OpportunityStage.PROPOSAL }
      const opp = fixtures.opportunity({ ...dtoWithStage, probability: 50 })
      repo.create.mockReturnValue(opp)
      repo.save.mockResolvedValue(opp)

      await service.create(dtoWithStage as never)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        stage: OpportunityStage.PROPOSAL,
        probability: 50,
      }))
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should use default page and pageSize when omitted', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({} as never, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('should return paginated list', async () => {
      const opps = [fixtures.opportunity()]
      const qb = createMockQueryBuilder(opps, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 }, adminUser)

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('should apply keyword filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, keyword: 'test' }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.title LIKE :kw',
        { kw: '%test%' },
      )
    })

    it('should apply stage filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, stage: OpportunityStage.PROPOSAL }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.stage = :stage',
        { stage: OpportunityStage.PROPOSAL },
      )
    })

    it('should apply customerId filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, customerId: 5 }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.customerId = :customerId',
        { customerId: 5 },
      )
    })

    it('should apply assignedUserId filter for admin', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, assignedUserId: 3 }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.assignedUserId = :assignedUserId',
        { assignedUserId: 3 },
      )
    })

    it('should paginate correctly', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 3, pageSize: 10 }, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(20) // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('should enforce data permission for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20 }, salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.assignedUserId = :currentUserId',
        { currentUserId: salesUser.id },
      )
    })

    it('should ignore assignedUserId query param for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, assignedUserId: 99 }, salesUser)

      // Should NOT apply assignedUserId=99 filter (SALES role blocks it)
      const calls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0])
      expect(calls).not.toContain('opportunity.assignedUserId = :assignedUserId')
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return opportunity from cache', async () => {
      const opp = fixtures.opportunity()
      redis.get.mockResolvedValue(JSON.stringify(opp))

      const result = await service.findOne(1, adminUser)

      expect(result.title).toBe('Test Opportunity')
      expect(repo.findOne).not.toHaveBeenCalled()
    })

    it('should query DB on cache miss and cache result', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity()
      repo.findOne.mockResolvedValue(opp)

      const result = await service.findOne(1, adminUser)

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1, deleted: false },
        relations: ['customer'],
      })
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('cache:opportunities:detail'),
        expect.any(String),
        120,
      )
      expect(result.title).toBe('Test Opportunity')
    })

    it('should throw NotFoundException if not found', async () => {
      redis.get.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('should allow SALES user to access own opportunity', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity({ assignedUserId: salesUser.id })
      repo.findOne.mockResolvedValue(opp)

      const result = await service.findOne(1, salesUser)
      expect(result.title).toBe('Test Opportunity')
    })

    it('should throw ForbiddenException for SALES accessing other user opportunity', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity({ assignedUserId: 99 })
      repo.findOne.mockResolvedValue(opp)

      await expect(service.findOne(1, otherSalesUser)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update opportunity and invalidate cache', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity()
      repo.findOne.mockResolvedValue({ ...opp })
      repo.save.mockImplementation(async (o) => o)

      const result = await service.update(1, { title: 'Updated Deal' } as never, adminUser)

      expect(result.title).toBe('Updated Deal')
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:opportunities:stats:*')
      expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('cache:opportunities:detail:1'))
    })

    it('should throw NotFoundException when updating non-existent', async () => {
      redis.get.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { title: 'X' } as never, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException for SALES updating other user opportunity', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity({ assignedUserId: 99 })
      repo.findOne.mockResolvedValue(opp)

      await expect(service.update(1, { title: 'X' } as never, otherSalesUser)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ---------- updateStage ---------- */
  describe('updateStage', () => {
    it('should update stage and set probability', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity()
      repo.findOne.mockResolvedValue({ ...opp })
      repo.save.mockImplementation(async (o) => o)

      const result = await service.updateStage(
        1,
        { stage: OpportunityStage.NEGOTIATION } as never,
        adminUser,
      )

      expect(result.previousStage).toBe(OpportunityStage.LEAD)
      expect(result.currentStage).toBe(OpportunityStage.NEGOTIATION)
      expect(result.opportunity.stage).toBe(OpportunityStage.NEGOTIATION)
      expect(result.opportunity.probability).toBe(75)
    })

    it('should set probability to 100 for CLOSED_WON', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity()
      repo.findOne.mockResolvedValue({ ...opp })
      repo.save.mockImplementation(async (o) => o)

      const result = await service.updateStage(
        1,
        { stage: OpportunityStage.CLOSED_WON } as never,
        adminUser,
      )

      expect(result.opportunity.probability).toBe(100)
    })

    it('should set probability to 0 for CLOSED_LOST', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity()
      repo.findOne.mockResolvedValue({ ...opp })
      repo.save.mockImplementation(async (o) => o)

      const result = await service.updateStage(
        1,
        { stage: OpportunityStage.CLOSED_LOST } as never,
        adminUser,
      )

      expect(result.opportunity.probability).toBe(0)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete and invalidate cache', async () => {
      redis.get.mockResolvedValue(null)
      const opp = fixtures.opportunity()
      repo.findOne.mockResolvedValue({ ...opp })
      repo.save.mockImplementation(async (o) => o)

      await service.remove(1)

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }))
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:opportunities:stats:*')
    })

    it('should throw NotFoundException if not found', async () => {
      redis.get.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- getStats ---------- */
  describe('getStats', () => {
    it('should return cached stats when cache hit', async () => {
      const cached = [{ stage: OpportunityStage.LEAD, count: 2, totalAmount: 10000 }]
      redis.get.mockResolvedValue(JSON.stringify(cached))

      const result = await service.getStats(adminUser)

      expect(result).toEqual(cached)
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('should return stage statistics for admin', async () => {
      const rawData = [
        { stage: OpportunityStage.LEAD, count: '5', totalAmount: '250000' },
        { stage: OpportunityStage.CLOSED_WON, count: '2', totalAmount: '100000' },
      ]
      const qb = createMockQueryBuilder([], 0)
      qb.getRawMany.mockResolvedValue(rawData)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStats(adminUser)

      expect(result).toHaveLength(2)
      expect(result[0].stage).toBe(OpportunityStage.LEAD)
      expect(result[0].count).toBe(5)
      expect(result[0].totalAmount).toBe(250000)
      expect(redis.set).toHaveBeenCalledWith(
        'cache:opportunities:stats:admin',
        expect.any(String),
        300,
      )
    })

    it('should filter by userId for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      qb.getRawMany.mockResolvedValue([])
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.getStats(salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.assignedUserId = :currentUserId',
        { currentUserId: salesUser.id },
      )
      expect(redis.set).toHaveBeenCalledWith(
        `cache:opportunities:stats:sales:${salesUser.id}`,
        expect.any(String),
        300,
      )
    })

    it('should map empty totalAmount to 0', async () => {
      const rawData = [
        { stage: OpportunityStage.LEAD, count: '1', totalAmount: null as unknown as string },
      ]
      const qb = createMockQueryBuilder([], 0)
      qb.getRawMany.mockResolvedValue(rawData)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStats(adminUser)

      expect(result[0]).toEqual({
        stage: OpportunityStage.LEAD,
        count: 1,
        totalAmount: 0,
      })
    })
  })

  /* ---------- exportCsv ---------- */
  describe('exportCsv', () => {
    it('should export CSV with BOM and header', async () => {
      const opps = [
        fixtures.opportunity({
          title: 'Deal A',
          customer: { name: '客户A' },
          stage: OpportunityStage.LEAD,
          amount: 50000,
          probability: 10,
        }),
      ]
      const qb = createMockQueryBuilder(opps, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)

      expect(csv.charCodeAt(0)).toBe(0xFEFF) // BOM
      expect(csv).toContain('标题,关联客户,阶段,金额,成交概率,预计成交日期,描述')
      expect(csv).toContain('Deal A')
    })

    it('should enforce data permission for SALES', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.exportCsv(salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'opportunity.assignedUserId = :currentUserId',
        { currentUserId: salesUser.id },
      )
    })

    it('should fallback optional fields and escape CSV special characters', async () => {
      const opp = fixtures.opportunity({
        title: 'Deal "X", Inc',
        customer: null,
        stage: 'custom_stage' as never,
        amount: undefined,
        probability: undefined,
        expectedCloseDate: undefined,
        description: 'line1,\nline2',
      })
      const qb = createMockQueryBuilder([opp], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)

      expect(csv).toContain('"Deal ""X"", Inc"')
      expect(csv).toContain(',,custom_stage,0,0,,')
      expect(csv).toContain('"line1,\nline2"')
    })

    it('should fallback null description to an empty CSV field', async () => {
      const opp = fixtures.opportunity({
        title: 'Desc Null Deal',
        description: null,
      })
      const qb = createMockQueryBuilder([opp], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)
      const row = csv.split('\n')[1]

      expect(row).toContain('Desc Null Deal')
      expect(row.endsWith(',')).toBe(true)
    })
  })
})
