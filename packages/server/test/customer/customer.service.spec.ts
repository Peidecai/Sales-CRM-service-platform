import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { CustomerService } from '../../src/modules/customer/customer.service'
import { Customer } from '../../src/modules/customer/customer.entity'
import { User } from '../../src/modules/user/user.entity'
import { DuplicateCheckService } from '../../src/modules/customer/services/duplicate-check.service'
import { CustomerNumberService } from '../../src/modules/customer/services/customer-number.service'
import { CustomerBloomService } from '../../src/modules/customer/services/customer-bloom.service'
import { RedisService } from '../../src/common/redis'
import { CustomFieldService } from '../../src/modules/custom-field/custom-field.service'
import { CustomerStatus, UserRole } from '@crm/shared'
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

describe('CustomerService', () => {
  let service: CustomerService
  let repo: MockRepository<Customer>
  let userRepo: MockRepository<User>
  let redis: MockRedisService
  let duplicateCheckService: { checkDuplicates: jest.Mock }
  let customerNumberService: { generate: jest.Mock }

  beforeEach(async () => {
    repo = createMockRepository<Customer>()
    userRepo = createMockRepository<User>()
    redis = createMockRedisService()
    duplicateCheckService = { checkDuplicates: jest.fn().mockResolvedValue([]) }
    customerNumberService = { generate: jest.fn().mockResolvedValue('CUS-20260312-0001') }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer), useValue: repo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: RedisService, useValue: redis },
        { provide: CustomFieldService, useValue: { validateCustomFields: jest.fn() } },
        { provide: DuplicateCheckService, useValue: duplicateCheckService },
        { provide: CustomerNumberService, useValue: customerNumberService },
        { provide: CustomerBloomService, useValue: { add: jest.fn(), mightExist: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile()

    service = module.get<CustomerService>(CustomerService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      name: 'New Customer',
      company: 'Corp',
      phone: '13800138000',
      assignedUserId: 1,
    }

    it('should create customer and invalidate cache', async () => {
      const customer = fixtures.customer({ ...dto })
      repo.create.mockReturnValue(customer)
      repo.save.mockResolvedValue(customer)

      const result = await service.create(dto as never)

      expect(repo.create).toHaveBeenCalledWith(dto)
      expect(repo.save).toHaveBeenCalledWith(customer)
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:customers:list:*')
      expect(result.name).toBe('New Customer')
    })

    it('should generate customer number via CustomerNumberService', async () => {
      const customer = fixtures.customer({ ...dto })
      repo.create.mockReturnValue(customer)
      repo.save.mockResolvedValue(customer)

      await service.create(dto as never)

      expect(customerNumberService.generate).toHaveBeenCalled()
      expect(customer.customerNo).toBe('CUS-20260312-0001')
    })

    it('should run duplicate check and throw ConflictException on match', async () => {
      duplicateCheckService.checkDuplicates.mockResolvedValue([
        { customer: { id: 5, name: 'Dup', company: 'X' }, matchType: 'phone', confidence: 95 },
      ])

      await expect(service.create(dto as never)).rejects.toThrow('发现可能重复的客户')
    })

    it('should skip duplicate check when forceCreate is true', async () => {
      const customer = fixtures.customer({ ...dto })
      repo.create.mockReturnValue(customer)
      repo.save.mockResolvedValue(customer)

      await service.create({ ...dto, forceCreate: true } as never)

      expect(duplicateCheckService.checkDuplicates).not.toHaveBeenCalled()
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should use default page and pageSize when omitted', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({} as never, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })

    it('should return cached result on cache hit', async () => {
      const cached = { list: [fixtures.customer()], total: 1 }
      redis.safeGet.mockResolvedValue(JSON.stringify(cached))

      const result = await service.findAll({ page: 1, pageSize: 20 }, adminUser)

      expect(result.total).toBe(1)
      expect(result.list).toHaveLength(1)
      // Should NOT query database
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('should query DB and cache result on cache miss', async () => {
      redis.safeGet.mockResolvedValue(null) // cache miss
      const customers = [fixtures.customer()]
      const qb = createMockQueryBuilder(customers, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 }, adminUser)

      expect(result.total).toBe(1)
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('cache:customers:list:'),
        expect.any(String),
        60, // CACHE_TTL.CUSTOMER_LIST
      )
    })

    it('should apply keyword filter', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, keyword: 'test' }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('customer.name LIKE'),
        { kw: '%test%' },
      )
    })

    it('should apply status filter', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, status: CustomerStatus.DEAL }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('customer.status = :status', {
        status: CustomerStatus.DEAL,
      })
    })

    it('should apply assignedUserId filter for admin', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, assignedUserId: 5 }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('customer.assignedUserId = :assignedUserId', {
        assignedUserId: 5,
      })
    })

    it('should paginate correctly', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 3, pageSize: 10 }, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(20) // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('should enforce data permission for SALES user', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20 }, salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith('customer.assignedUserId = :currentUserId', {
        currentUserId: salesUser.id,
      })
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return customer from cache without DB lookup', async () => {
      const customer = fixtures.customer({ id: 8 })
      redis.safeGet.mockResolvedValue(JSON.stringify(customer))

      const result = await service.findOne(8, adminUser)

      expect(result.id).toBe(8)
      expect(repo.findOne).not.toHaveBeenCalled()
    })

    it('should return customer detail from DB on cache miss', async () => {
      const customer = fixtures.customer()
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(customer)

      const result = await service.findOne(1)

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      })
      expect(result.name).toBe('Test Customer')
    })

    it('should throw NotFoundException if not found', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })

    it('should allow SALES user to access own customer', async () => {
      redis.safeGet.mockResolvedValue(null)
      const customer = fixtures.customer({ assignedUserId: salesUser.id })
      repo.findOne.mockResolvedValue(customer)

      await expect(service.findOne(1, salesUser)).resolves.toEqual(customer)
    })

    it('should throw ForbiddenException for SALES accessing other customer', async () => {
      redis.safeGet.mockResolvedValue(null)
      const customer = fixtures.customer({ assignedUserId: 99 })
      repo.findOne.mockResolvedValue(customer)

      await expect(service.findOne(1, salesUser)).rejects.toThrow(ForbiddenException)
    })

    it('should enforce ownership check for cached customer too', async () => {
      const customer = fixtures.customer({ assignedUserId: 99 })
      redis.safeGet.mockResolvedValue(JSON.stringify(customer))

      await expect(service.findOne(1, salesUser)).rejects.toThrow(ForbiddenException)
      expect(repo.findOne).not.toHaveBeenCalled()
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update customer and invalidate cache', async () => {
      const customer = fixtures.customer()
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue({ ...customer })
      repo.save.mockImplementation(async (c) => c)

      const result = await service.update(1, { name: 'Updated' } as never)

      expect(result.name).toBe('Updated')
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:customers:list:*')
    })

    it('should throw NotFoundException if not found', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { name: 'X' } as never)).rejects.toThrow(NotFoundException)
    })

    it('should reject invalid status transition', async () => {
      const customer = fixtures.customer({ status: CustomerStatus.LEAD })
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue({ ...customer })

      await expect(
        service.update(1, { status: CustomerStatus.DEAL } as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('should accept valid forward status transition', async () => {
      const customer = fixtures.customer({ status: CustomerStatus.LEAD })
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue({ ...customer })
      repo.save.mockImplementation(async (c) => c)

      const result = await service.update(1, { status: CustomerStatus.POTENTIAL } as never)

      expect(result.status).toBe(CustomerStatus.POTENTIAL)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete customer and invalidate cache', async () => {
      const customer = fixtures.customer()
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue({ ...customer })
      repo.softRemove.mockResolvedValue(customer)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:customers:list:*')
    })

    it('should throw NotFoundException if not found', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- allocate ---------- */
  describe('allocate', () => {
    it('should reassign customer to target user', async () => {
      const customer = fixtures.customer()
      repo.findOne
        .mockResolvedValueOnce(customer)
      userRepo.findOne.mockResolvedValue({ id: 5, isActive: true })
      repo.save.mockImplementation(async (c) => c)

      const result = await service.allocate(1, { assignedUserId: 5 })

      expect(result.assignedUserId).toBe(5)
    })

    it('should throw if target user not found', async () => {
      repo.findOne.mockResolvedValue(fixtures.customer())
      userRepo.findOne.mockResolvedValue(null)

      await expect(service.allocate(1, { assignedUserId: 99 })).rejects.toThrow(NotFoundException)
    })

    it('should throw if target user is inactive', async () => {
      repo.findOne.mockResolvedValue(fixtures.customer())
      userRepo.findOne.mockResolvedValue({ id: 5, isActive: false })

      await expect(service.allocate(1, { assignedUserId: 5 })).rejects.toThrow(BadRequestException)
    })
  })

  /* ---------- validateStatusTransition ---------- */
  describe('validateStatusTransition', () => {
    it('should allow forward-by-one transitions', () => {
      expect(service.validateStatusTransition(CustomerStatus.LEAD, CustomerStatus.POTENTIAL)).toBe(true)
      expect(service.validateStatusTransition(CustomerStatus.POTENTIAL, CustomerStatus.INTENTION)).toBe(true)
      expect(service.validateStatusTransition(CustomerStatus.DEAL, CustomerStatus.MAINTAIN)).toBe(true)
    })

    it('should reject skipping steps', () => {
      expect(service.validateStatusTransition(CustomerStatus.LEAD, CustomerStatus.DEAL)).toBe(false)
    })

    it('should reject backward transitions', () => {
      expect(service.validateStatusTransition(CustomerStatus.DEAL, CustomerStatus.LEAD)).toBe(false)
    })

    it('should allow transition to INVALID from any state', () => {
      expect(service.validateStatusTransition(CustomerStatus.LEAD, CustomerStatus.INVALID)).toBe(true)
      expect(service.validateStatusTransition(CustomerStatus.DEAL, CustomerStatus.INVALID)).toBe(true)
    })

    it('should allow transition to LOST from any state', () => {
      expect(service.validateStatusTransition(CustomerStatus.POTENTIAL, CustomerStatus.LOST)).toBe(true)
    })

    it('should reject transition from INVALID/LOST back to main flow', () => {
      expect(service.validateStatusTransition(CustomerStatus.INVALID, CustomerStatus.LEAD)).toBe(false)
      expect(service.validateStatusTransition(CustomerStatus.LOST, CustomerStatus.POTENTIAL)).toBe(false)
    })
  })

  /* ---------- extendProtection ---------- */
  describe('extendProtection', () => {
    it('should extend protection for non-pool customer', async () => {
      const customer = fixtures.customer({ isInPool: false, protectUntil: null, status: CustomerStatus.LEAD })
      repo.findOne.mockResolvedValue(customer)
      repo.save.mockImplementation(async (c) => c)

      await service.extendProtection(1)

      expect(repo.save).toHaveBeenCalled()
      expect(customer.protectUntil).toBeInstanceOf(Date)
    })

    it('should skip pool customers', async () => {
      repo.findOne.mockResolvedValue(fixtures.customer({ isInPool: true }))

      await service.extendProtection(1)

      expect(repo.save).not.toHaveBeenCalled()
    })

    it('should skip if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await service.extendProtection(999)

      expect(repo.save).not.toHaveBeenCalled()
    })
  })
})
