import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, In } from 'typeorm'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { ProspectService } from '../src/modules/prospect/prospect.service'
import { Prospect } from '../src/modules/prospect/prospect.entity'
import { ProspectSearchLog } from '../src/modules/prospect/entities/prospect-search-log.entity'
import { Customer } from '../src/modules/customer/customer.entity'
import { MockProspectAdapter } from '../src/modules/prospect/adapters/mock.adapter'
import { TianyanchaAdapter } from '../src/modules/prospect/adapters/tianyancha.adapter'
import { QichachaAdapter } from '../src/modules/prospect/adapters/qichacha.adapter'
import { ProspectConfigService } from '../src/modules/prospect/prospect-config.service'
import { RedisService } from '../src/common/redis'
import { ProspectChannel, ProspectStatus, UserRole, CustomerStatus, CustomerSource } from '@crm/shared'
import type { AuthUser } from '../src/common/decorators/current-user.decorator'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  createMockDataSource,
  type MockRepository,
  type MockRedisService,
  type MockQueryBuilder,
} from './test-utils'

describe('ProspectService', () => {
  let service: ProspectService
  let prospectRepo: MockRepository<Prospect>
  let searchLogRepo: MockRepository<ProspectSearchLog>
  let customerRepo: MockRepository<Customer>
  let redisService: MockRedisService
  let mockAdapter: MockProspectAdapter
  let tianyanchaAdapter: TianyanchaAdapter
  let qichachaAdapter: QichachaAdapter
  let mockDataSource: ReturnType<typeof createMockDataSource>

  const adminUser: AuthUser = { id: 1, username: 'admin', role: UserRole.ADMIN }
  const salesUser: AuthUser = { id: 10, username: 'sales', role: UserRole.SALES }

  const prospectFixture = (overrides: Record<string, unknown> = {}): Prospect =>
    ({
      id: 1,
      companyName: '深圳华创科技有限公司',
      legalPerson: '张伟',
      registeredCapital: '1000',
      establishDate: '2015-03-15',
      industry: '互联网/IT',
      province: '广东',
      city: '深圳',
      address: '广东深圳高新区创业路1号',
      unifiedCreditCode: '91440000MA1000001X0',
      phone: '0755-80000001',
      email: 'contact@huachuang1.com',
      website: 'https://www.huachuang1.com',
      employeeCount: 200,
      businessScope: '从事互联网/IT领域',
      channel: ProspectChannel.MOCK,
      status: ProspectStatus.NEW,
      remark: null,
      assignedUserId: 1,
      convertedCustomerId: null,
      convertedAt: null,
      searchBatchId: null,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      ...overrides,
    }) as Prospect

  beforeEach(async () => {
    prospectRepo = createMockRepository<Prospect>()
    searchLogRepo = createMockRepository<ProspectSearchLog>()
    customerRepo = createMockRepository<Customer>()
    redisService = createMockRedisService()
    mockDataSource = createMockDataSource()

    // Configure mock adapter
    mockAdapter = new MockProspectAdapter()
    tianyanchaAdapter = { channel: ProspectChannel.TIANYANCHA, isAvailable: () => false, search: jest.fn(), getDetail: jest.fn() } as unknown as TianyanchaAdapter
    qichachaAdapter = { channel: ProspectChannel.QICHACHA, isAvailable: () => false, search: jest.fn(), getDetail: jest.fn() } as unknown as QichachaAdapter

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectService,
        { provide: getRepositoryToken(Prospect), useValue: prospectRepo },
        { provide: getRepositoryToken(ProspectSearchLog), useValue: searchLogRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: RedisService, useValue: redisService },
        { provide: MockProspectAdapter, useValue: mockAdapter },
        { provide: TianyanchaAdapter, useValue: tianyanchaAdapter },
        { provide: QichachaAdapter, useValue: qichachaAdapter },
        { provide: ProspectConfigService, useValue: {
          getConfiguredAdapter: jest.fn().mockResolvedValue(null),
          incrementUsage: jest.fn().mockResolvedValue(undefined),
        }},
      ],
    }).compile()

    service = module.get(ProspectService)
  })

  /* ================ search ================ */

  describe('search', () => {
    it('should search via mock adapter and return results with duplicate marks', async () => {
      // Mock customer repo for duplicate check
      const customerQb = createMockQueryBuilder()
      customerRepo.createQueryBuilder.mockReturnValue(customerQb as unknown)

      const searchLogSave = jest.fn().mockResolvedValue({})
      searchLogRepo.create.mockReturnValue({})
      searchLogRepo.save.mockImplementation(searchLogSave)

      const result = await service.search({ keyword: '华创', page: 1, pageSize: 5 }, adminUser)

      expect(result.results).toBeDefined()
      expect(result.total).toBeGreaterThan(0)
      // Each result should have isDuplicate field
      for (const r of result.results) {
        expect(typeof r.isDuplicate).toBe('boolean')
      }
    })

    it('should mark existing customers as duplicates', async () => {
      const existingCustomer = { id: 99, company: '深圳华创科技有限公司', name: '深圳华创科技有限公司', unifiedCreditCode: null }
      const customerQbCode = createMockQueryBuilder()
      const customerQbName = createMockQueryBuilder([existingCustomer], 1)

      let callCount = 0
      customerRepo.createQueryBuilder.mockImplementation(() => {
        callCount++
        // First call is for unifiedCreditCode lookup, second for name lookup
        return callCount === 1 ? customerQbCode : customerQbName
      })

      searchLogRepo.create.mockReturnValue({})
      searchLogRepo.save.mockResolvedValue({})

      const result = await service.search({ keyword: '华创', page: 1, pageSize: 5 }, adminUser)

      // At least some results should be marked as duplicates
      const hasDuplicate = result.results.some((r) => r.isDuplicate)
      expect(hasDuplicate).toBe(true)
    })
  })

  /* ================ importToPool ================ */

  describe('importToPool', () => {
    it('should import new prospects to pool', async () => {
      prospectRepo.findOne.mockResolvedValue(null) // no existing prospects
      prospectRepo.create.mockImplementation((data) => data as Prospect)
      prospectRepo.save.mockImplementation(async (data) => data as Prospect)

      const results = [
        {
          companyName: '测试公司A',
          channel: ProspectChannel.MOCK,
          unifiedCreditCode: 'CODE001',
        },
      ]

      const result = await service.importToPool(results as never[], adminUser)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(0)
      expect(prospectRepo.save).toHaveBeenCalledTimes(1)
    })

    it('should skip duplicates when importing', async () => {
      // First call: check by unifiedCreditCode — found
      prospectRepo.findOne.mockResolvedValueOnce(prospectFixture())

      const results = [
        {
          companyName: '深圳华创科技有限公司',
          channel: ProspectChannel.MOCK,
          unifiedCreditCode: '91440000MA1000001X0',
        },
      ]

      const result = await service.importToPool(results as never[], adminUser)
      expect(result.imported).toBe(0)
      expect(result.skipped).toBe(1)
    })

    it('should invalidate cache after import', async () => {
      prospectRepo.findOne.mockResolvedValue(null)
      prospectRepo.create.mockImplementation((data) => data as Prospect)
      prospectRepo.save.mockImplementation(async (data) => data as Prospect)

      await service.importToPool(
        [{ companyName: '测试', channel: ProspectChannel.MOCK }] as never[],
        adminUser,
      )

      expect(redisService.delByPattern).toHaveBeenCalled()
    })
  })

  /* ================ findAll ================ */

  describe('findAll', () => {
    it('should return paginated list from DB on cache miss', async () => {
      const prospects = [prospectFixture()]
      const qb = createMockQueryBuilder(prospects, 1)
      prospectRepo.createQueryBuilder.mockReturnValue(qb as unknown)

      const result = await service.findAll({ page: 1, pageSize: 20 }, adminUser)

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(redisService.set).toHaveBeenCalled()
    })

    it('should return cached data on cache hit', async () => {
      const cached = { list: [prospectFixture()], total: 1 }
      redisService.safeGet.mockResolvedValue(JSON.stringify(cached))

      const result = await service.findAll({ page: 1, pageSize: 20 }, adminUser)

      expect(result.list).toHaveLength(1)
      expect(prospectRepo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('should apply data permission for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      prospectRepo.createQueryBuilder.mockReturnValue(qb as unknown)

      await service.findAll({ page: 1, pageSize: 20 }, salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'prospect.assignedUserId = :currentUserId',
        { currentUserId: salesUser.id },
      )
    })

    it('should filter by status when provided', async () => {
      const qb = createMockQueryBuilder([], 0)
      prospectRepo.createQueryBuilder.mockReturnValue(qb as unknown)

      await service.findAll({ status: ProspectStatus.NEW }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('prospect.status = :status', { status: ProspectStatus.NEW })
    })

    it('should filter by keyword when provided', async () => {
      const qb = createMockQueryBuilder([], 0)
      prospectRepo.createQueryBuilder.mockReturnValue(qb as unknown)

      await service.findAll({ keyword: '华创' }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('prospect.companyName LIKE :kw', { kw: '%华创%' })
    })
  })

  /* ================ findOne ================ */

  describe('findOne', () => {
    it('should return prospect from DB on cache miss', async () => {
      const prospect = prospectFixture()
      prospectRepo.findOne.mockResolvedValue(prospect)

      const result = await service.findOne(1, adminUser)

      expect(result.companyName).toBe('深圳华创科技有限公司')
      expect(redisService.set).toHaveBeenCalled()
    })

    it('should return cached prospect on cache hit', async () => {
      redisService.safeGet.mockResolvedValue(JSON.stringify(prospectFixture()))

      const result = await service.findOne(1, adminUser)

      expect(result.companyName).toBe('深圳华创科技有限公司')
      expect(prospectRepo.findOne).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when prospect not found', async () => {
      prospectRepo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException for SALES user accessing unowned prospect', async () => {
      const prospect = prospectFixture({ assignedUserId: 999 })
      prospectRepo.findOne.mockResolvedValue(prospect)

      await expect(service.findOne(1, salesUser)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ================ update ================ */

  describe('update', () => {
    it('should update prospect and invalidate cache', async () => {
      const prospect = prospectFixture()
      prospectRepo.findOne.mockResolvedValue(prospect)
      prospectRepo.save.mockResolvedValue({ ...prospect, remark: '新备注' })

      const result = await service.update(1, { remark: '新备注' }, adminUser)

      expect(prospectRepo.save).toHaveBeenCalled()
      expect(redisService.delByPattern).toHaveBeenCalled()
    })

    it('should reject updating a converted prospect status', async () => {
      const prospect = prospectFixture({ status: ProspectStatus.CONVERTED })
      prospectRepo.findOne.mockResolvedValue(prospect)

      await expect(
        service.update(1, { status: ProspectStatus.NEW }, adminUser),
      ).rejects.toThrow(BadRequestException)
    })
  })

  /* ================ convert ================ */

  describe('convert', () => {
    it('should convert prospect to customer in a transaction', async () => {
      const prospect = prospectFixture()
      const savedCustomer = { id: 100 }

      mockDataSource.mockQueryRunner.manager.findOne.mockResolvedValue(prospect)
      // Add create method to mock manager
      ;(mockDataSource.mockQueryRunner.manager as Record<string, unknown>).create = jest.fn().mockReturnValue({})
      mockDataSource.mockQueryRunner.manager.save
        .mockResolvedValueOnce(savedCustomer) // save Customer
        .mockResolvedValueOnce(prospect) // save Prospect

      const result = await service.convert({ prospectIds: [1] }, adminUser)

      expect(result.convertedCount).toBe(1)
      expect(result.customerIds).toContain(100)
      expect(mockDataSource.mockQueryRunner.commitTransaction).toHaveBeenCalled()
    })

    it('should rollback on error during conversion', async () => {
      mockDataSource.mockQueryRunner.manager.findOne.mockResolvedValue(null)

      await expect(
        service.convert({ prospectIds: [999] }, adminUser),
      ).rejects.toThrow(NotFoundException)

      expect(mockDataSource.mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    })

    it('should reject converting already converted prospect', async () => {
      const prospect = prospectFixture({ status: ProspectStatus.CONVERTED })
      mockDataSource.mockQueryRunner.manager.findOne.mockResolvedValue(prospect)

      await expect(
        service.convert({ prospectIds: [1] }, adminUser),
      ).rejects.toThrow(BadRequestException)
    })
  })

  /* ================ batchOperate ================ */

  describe('batchOperate', () => {
    it('should batch assign prospects', async () => {
      prospectRepo.update.mockResolvedValue({ affected: 3 })

      const result = await service.batchOperate(
        { ids: [1, 2, 3], action: 'assign', assignedUserId: 5 },
        adminUser,
      )

      expect(result.affected).toBe(3)
      expect(prospectRepo.update).toHaveBeenCalledWith(
        { id: In([1, 2, 3]), status: In([ProspectStatus.NEW, ProspectStatus.CONTACTED, ProspectStatus.QUALIFIED]) },
        { assignedUserId: 5 },
      )
    })

    it('should batch reject prospects', async () => {
      prospectRepo.update.mockResolvedValue({ affected: 2 })

      const result = await service.batchOperate(
        { ids: [1, 2], action: 'reject' },
        adminUser,
      )

      expect(result.affected).toBe(2)
    })

    it('should throw if batch assign without assignedUserId', async () => {
      await expect(
        service.batchOperate({ ids: [1], action: 'assign' } as never, adminUser),
      ).rejects.toThrow(BadRequestException)
    })
  })

  /* ================ remove ================ */

  describe('remove', () => {
    it('should soft remove prospect', async () => {
      const prospect = prospectFixture()
      prospectRepo.findOne.mockResolvedValue(prospect)
      prospectRepo.softRemove.mockResolvedValue(prospect)

      await service.remove(1, adminUser)

      expect(prospectRepo.softRemove).toHaveBeenCalledWith(prospect)
    })
  })

  /* ================ getStats ================ */

  describe('getStats', () => {
    it('should return stats from cache on hit', async () => {
      const stats = { total: 100, newCount: 40, contactedCount: 20, qualifiedCount: 15, convertedCount: 20, rejectedCount: 5, conversionRate: 20 }
      redisService.safeGet.mockResolvedValue(JSON.stringify(stats))

      const result = await service.getStats(adminUser)

      expect(result.total).toBe(100)
      expect(result.conversionRate).toBe(20)
    })

    it('should compute stats from DB on cache miss', async () => {
      const qb = createMockQueryBuilder([], 50)
      prospectRepo.createQueryBuilder.mockReturnValue(qb as unknown)

      // Mock the status groupBy query
      const statusQb = createMockQueryBuilder()
      ;(statusQb as MockQueryBuilder).getRawMany.mockResolvedValue([
        { status: 'new', count: '30' },
        { status: 'converted', count: '10' },
        { status: 'rejected', count: '5' },
      ])
      // Second createQueryBuilder call returns statusQb
      prospectRepo.createQueryBuilder
        .mockReturnValueOnce(qb as unknown)
        .mockReturnValueOnce(statusQb as unknown)

      const result = await service.getStats(adminUser)

      expect(result.total).toBe(50)
      expect(redisService.set).toHaveBeenCalled()
    })
  })

  /* ================ getSearchHistory ================ */

  describe('getSearchHistory', () => {
    it('should return search history for user', async () => {
      const logs = [{ id: 1, userId: 1, channel: ProspectChannel.MOCK, resultCount: 10 }]
      searchLogRepo.find.mockResolvedValue(logs)

      const result = await service.getSearchHistory(adminUser)

      expect(result).toHaveLength(1)
      expect(searchLogRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1 } }),
      )
    })
  })
})
