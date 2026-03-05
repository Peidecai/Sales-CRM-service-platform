import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { CustomerService } from '../../src/modules/customer/customer.service'
import { Customer } from '../../src/modules/customer/customer.entity'
import { RedisService } from '../../src/common/redis'
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
  let redis: MockRedisService

  beforeEach(async () => {
    repo = createMockRepository<Customer>()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer), useValue: repo },
        { provide: RedisService, useValue: redis },
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
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return cached result on cache hit', async () => {
      const cached = { list: [fixtures.customer()], total: 1 }
      redis.get.mockResolvedValue(JSON.stringify(cached))

      const result = await service.findAll({ page: 1, pageSize: 20 }, adminUser)

      expect(result.total).toBe(1)
      expect(result.list).toHaveLength(1)
      // Should NOT query database
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('should query DB and cache result on cache miss', async () => {
      redis.get.mockResolvedValue(null) // cache miss
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
      redis.get.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, keyword: 'test' }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('customer.name LIKE'),
        { kw: '%test%' },
      )
    })

    it('should apply status filter', async () => {
      redis.get.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, status: CustomerStatus.SIGNED }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('customer.status = :status', {
        status: CustomerStatus.SIGNED,
      })
    })

    it('should apply assignedUserId filter for admin', async () => {
      redis.get.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, assignedUserId: 5 }, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('customer.assignedUserId = :assignedUserId', {
        assignedUserId: 5,
      })
    })

    it('should paginate correctly', async () => {
      redis.get.mockResolvedValue(null)
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 3, pageSize: 10 }, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(20) // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('should enforce data permission for SALES user', async () => {
      redis.get.mockResolvedValue(null)
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
    it('should return customer with relations', async () => {
      const customer = fixtures.customer()
      repo.findOne.mockResolvedValue(customer)

      const result = await service.findOne(1)

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1, deleted: false },
        relations: ['opportunities', 'callRecords'],
      })
      expect(result.name).toBe('Test Customer')
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update customer and invalidate cache', async () => {
      const customer = fixtures.customer()
      repo.findOne.mockResolvedValue({ ...customer })
      repo.save.mockImplementation(async (c) => c)

      const result = await service.update(1, { name: 'Updated' } as never)

      expect(result.name).toBe('Updated')
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:customers:list:*')
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { name: 'X' } as never)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete customer and invalidate cache', async () => {
      const customer = fixtures.customer()
      repo.findOne.mockResolvedValue({ ...customer })
      repo.save.mockImplementation(async (c) => c)

      await service.remove(1)

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }))
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:customers:list:*')
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- exportCsv ---------- */
  describe('exportCsv', () => {
    it('should export all customers as CSV with BOM', async () => {
      const customers = [
        fixtures.customer({ name: 'Alice', company: 'Corp A', phone: '13800138001', email: 'a@test.com', status: CustomerStatus.SIGNED }),
        fixtures.customer({ id: 2, name: 'Bob', company: null, phone: null, email: null, status: CustomerStatus.POTENTIAL }),
      ]
      const qb = createMockQueryBuilder(customers, 2)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)

      // BOM
      expect(csv.charCodeAt(0)).toBe(0xFEFF)
      // Header
      expect(csv).toContain('姓名,公司,手机,邮箱,状态,行业,来源,备注')
      // Data rows
      expect(csv).toContain('Alice')
      expect(csv).toContain('Bob')
    })

    it('should escape CSV fields with commas', async () => {
      const customer = fixtures.customer({ name: 'Foo, Bar', company: 'Corp "A"' })
      const qb = createMockQueryBuilder([customer], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)

      expect(csv).toContain('"Foo, Bar"')
      expect(csv).toContain('"Corp ""A"""')
    })

    it('should enforce data permission for SALES', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.exportCsv(salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'customer.assignedUserId = :currentUserId',
        { currentUserId: salesUser.id },
      )
    })
  })

  /* ---------- importFromCsvRows ---------- */
  describe('importFromCsvRows', () => {
    it('should import valid rows', async () => {
      const rows = [
        { '姓名': 'Alice', '公司': 'Corp', '状态': '潜在客户' },
        { '姓名': 'Bob', '公司': 'Inc', '状态': 'signed' },
      ]
      repo.create.mockImplementation((items) => items)
      repo.save.mockResolvedValue([])

      const result = await service.importFromCsvRows(rows, 1)

      expect(result.imported).toBe(2)
      expect(result.errors).toHaveLength(0)
      expect(redis.delByPattern).toHaveBeenCalled()
    })

    it('should collect errors for invalid rows', async () => {
      const rows: Record<string, string>[] = [
        { '姓名': '', '公司': 'Corp' }, // empty name
        { '姓名': 'Alice', '状态': '无效状态' }, // invalid status
        { '姓名': 'Bob', '状态': '已签约' }, // valid
      ]
      repo.create.mockImplementation((items) => items)
      repo.save.mockResolvedValue([])

      const result = await service.importFromCsvRows(rows, 1)

      expect(result.imported).toBe(1) // only Bob
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toContain('第2行')
      expect(result.errors[1]).toContain('第3行')
    })

    it('should throw BadRequestException if no valid rows', async () => {
      const rows = [{ '姓名': '' }] // all invalid

      await expect(service.importFromCsvRows(rows, 1)).rejects.toThrow(BadRequestException)
    })
  })
})
