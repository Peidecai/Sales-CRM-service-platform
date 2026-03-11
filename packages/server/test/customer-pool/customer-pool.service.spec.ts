import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { CustomerPoolService } from '../../src/modules/customer-pool/customer-pool.service'
import { Customer } from '../../src/modules/customer/customer.entity'
import { CustomerPoolLog, PoolAction } from '../../src/modules/customer-pool/entities/customer-pool-log.entity'
import { CustomerPoolConfigService } from '../../src/modules/customer-pool/customer-pool-config.service'
import { RedisService } from '../../src/common/redis'
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockRedisService,
  fixtures,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'

const defaultConfig = {
  daily_claim_limit: 5,
  max_holding: 50,
  cooldown_days: 3,
  protect_days_new: 15,
  auto_recycle_enabled: true,
  recycle_days_lead: 7,
  recycle_days_potential: 15,
  recycle_days_following: 30,
  recycle_days_intention: 45,
}

const mockConfigService = {
  getConfig: jest.fn().mockResolvedValue(defaultConfig),
  updateConfig: jest.fn(),
  getConfigValue: jest.fn(),
}

const poolCustomer = (overrides: Record<string, unknown> = {}) => ({
  ...fixtures.customer(),
  isInPool: true,
  poolEnterTime: new Date('2025-03-01'),
  protectUntil: null,
  ...overrides,
})

describe('CustomerPoolService', () => {
  let service: CustomerPoolService
  let customerRepo: MockRepository<Customer>
  let poolLogRepo: MockRepository<CustomerPoolLog>
  let redisService: MockRedisService

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn().mockImplementation(async (entity) => entity),
    },
  }

  beforeEach(async () => {
    customerRepo = createMockRepository<Customer>()
    poolLogRepo = createMockRepository<CustomerPoolLog>()
    redisService = createMockRedisService()

    Object.defineProperty(customerRepo, 'manager', {
      value: { connection: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } },
      configurable: true,
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerPoolService,
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(CustomerPoolLog), useValue: poolLogRepo },
        { provide: CustomerPoolConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile()

    service = module.get<CustomerPoolService>(CustomerPoolService)
    jest.clearAllMocks()
    mockConfigService.getConfig.mockResolvedValue(defaultConfig)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- claim ---------- */
  describe('claim', () => {
    it('should claim a customer from the pool successfully', async () => {
      const customer = poolCustomer()
      customerRepo.findOne.mockResolvedValue({ ...customer })

      // No last return log (cooldown check passes)
      const logQb = createMockQueryBuilder([], 0)
      logQb.getOne.mockResolvedValue(null)
      poolLogRepo.createQueryBuilder.mockReturnValue(logQb)

      // Daily claim count = 1 (under limit)
      redisService.incr.mockResolvedValue(1)

      // Holding count under limit
      customerRepo.count.mockResolvedValue(10)

      poolLogRepo.create.mockReturnValue({ customerId: 1, action: PoolAction.CLAIM, toUserId: 1 })

      const result = await service.claim(1, 1)

      expect(result.isInPool).toBe(false)
      expect(result.assignedUserId).toBe(1)
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
    })

    it('should throw NotFoundException if customer not in pool', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.claim(1, 999)).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException during cooldown period', async () => {
      const customer = poolCustomer()
      customerRepo.findOne.mockResolvedValue({ ...customer })

      // Last return was just now (within cooldown)
      const recentReturn = { createdAt: new Date(), action: PoolAction.RETURN }
      const logQb = createMockQueryBuilder([], 0)
      logQb.getOne.mockResolvedValue(recentReturn)
      poolLogRepo.createQueryBuilder.mockReturnValue(logQb)

      await expect(service.claim(1, 1)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when daily claim limit exceeded', async () => {
      const customer = poolCustomer()
      customerRepo.findOne.mockResolvedValue({ ...customer })

      const logQb = createMockQueryBuilder([], 0)
      logQb.getOne.mockResolvedValue(null)
      poolLogRepo.createQueryBuilder.mockReturnValue(logQb)

      // Daily limit exceeded
      redisService.incr.mockResolvedValue(6)

      await expect(service.claim(1, 1)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when max holding reached', async () => {
      const customer = poolCustomer()
      customerRepo.findOne.mockResolvedValue({ ...customer })

      const logQb = createMockQueryBuilder([], 0)
      logQb.getOne.mockResolvedValue(null)
      poolLogRepo.createQueryBuilder.mockReturnValue(logQb)

      redisService.incr.mockResolvedValue(1)
      customerRepo.count.mockResolvedValue(50) // At max

      await expect(service.claim(1, 1)).rejects.toThrow(BadRequestException)
    })
  })

  /* ---------- batchClaim ---------- */
  describe('batchClaim', () => {
    it('should return success and failed results', async () => {
      // Mock claim to succeed for id=1, fail for id=2
      jest.spyOn(service, 'claim')
        .mockResolvedValueOnce(poolCustomer() as never)
        .mockRejectedValueOnce(new NotFoundException('客户不在公海池中'))

      const result = await service.batchClaim(1, [1, 2])

      expect(result.success).toEqual([1])
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].id).toBe(2)
    })
  })

  /* ---------- assign ---------- */
  describe('assign', () => {
    it('should assign a customer from pool to target user', async () => {
      const customer = poolCustomer()
      customerRepo.findOne.mockResolvedValue({ ...customer })
      poolLogRepo.create.mockReturnValue({ customerId: 1, action: PoolAction.ASSIGN, toUserId: 5 })

      const result = await service.assign(2, 1, 5)

      expect(result.assignedUserId).toBe(5)
      expect(result.isInPool).toBe(false)
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
    })

    it('should throw NotFoundException if customer not in pool', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.assign(2, 999, 5)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- returnToPool ---------- */
  describe('returnToPool', () => {
    it('should return customer to pool', async () => {
      const customer = { ...fixtures.customer(), isInPool: false, assignedUserId: 1 }
      customerRepo.findOne.mockResolvedValue({ ...customer })
      poolLogRepo.create.mockReturnValue({ customerId: 1, action: PoolAction.RETURN, fromUserId: 1 })

      await service.returnToPool(1, 1, '不再跟进')

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
    })

    it('should throw NotFoundException if customer not found', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.returnToPool(1, 999)).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if customer not assigned to user', async () => {
      const customer = { ...fixtures.customer(), assignedUserId: 99 }
      customerRepo.findOne.mockResolvedValue(customer)

      await expect(service.returnToPool(1, 1)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ---------- getPoolList ---------- */
  describe('getPoolList', () => {
    it('should return paginated pool customers', async () => {
      const customers = [poolCustomer()]
      const qb = createMockQueryBuilder(customers, 1)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getPoolList({ page: 1, pageSize: 20 } as never)

      expect(qb.where).toHaveBeenCalledWith('customer.is_in_pool = true')
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should apply keyword filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getPoolList({ keyword: 'test' } as never)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(customer.name LIKE :kw OR customer.company LIKE :kw)',
        { kw: '%test%' },
      )
    })

    it('should apply industry and region filters', async () => {
      const qb = createMockQueryBuilder([], 0)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getPoolList({ industry: 'IT', region: '上海' } as never)

      expect(qb.andWhere).toHaveBeenCalledWith('customer.industry = :industry', { industry: 'IT' })
      expect(qb.andWhere).toHaveBeenCalledWith('customer.region LIKE :region', { region: '%上海%' })
    })
  })

  /* ---------- getPoolLogs ---------- */
  describe('getPoolLogs', () => {
    it('should return paginated pool logs', async () => {
      const logs = [{ id: 1, customerId: 1, action: PoolAction.CLAIM }]
      const qb = createMockQueryBuilder(logs, 1)
      poolLogRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getPoolLogs({ page: 1, pageSize: 20 } as never)

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by customerId when provided', async () => {
      const qb = createMockQueryBuilder([], 0)
      poolLogRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getPoolLogs({ customerId: 1, page: 1, pageSize: 20 } as never)

      expect(qb.where).toHaveBeenCalledWith('log.customer_id = :customerId', { customerId: 1 })
    })
  })
})
