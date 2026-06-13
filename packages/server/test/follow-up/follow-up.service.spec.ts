import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { FollowUpService } from '../../src/modules/follow-up/follow-up.service'
import { FollowUp, FollowUpType } from '../../src/modules/follow-up/follow-up.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { CustomerService } from '../../src/modules/customer/customer.service'
import { RedisService } from '../../src/common/redis'
import {
  createMockRepository,
  createMockRedisService,
  fixtures,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

describe('FollowUpService', () => {
  let service: FollowUpService
  let followUpRepo: MockRepository<FollowUp> & { findAndCount: jest.Mock }
  let customerRepo: MockRepository<Customer>
  let redis: MockRedisService

  const adminUser: AuthUser = { id: 1, username: 'admin', role: UserRole.ADMIN }
  const salesUser: AuthUser = { id: 2, username: 'sales01', role: UserRole.SALES }
  const otherSalesUser: AuthUser = { id: 3, username: 'sales02', role: UserRole.SALES }

  const createDto = {
    customerId: 10,
    type: FollowUpType.CALL,
    content: 'First follow-up',
  }

  const makeFollowUp = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 100,
      customerId: 10,
      userId: 2,
      type: FollowUpType.CALL,
      content: 'First follow-up',
      nextFollowUpDate: null,
      nextFollowUpNote: null,
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as unknown as FollowUp

  beforeEach(async () => {
    followUpRepo = Object.assign(createMockRepository<FollowUp>(), {
      findAndCount: jest.fn(),
    })
    customerRepo = createMockRepository<Customer>()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpService,
        { provide: getRepositoryToken(FollowUp), useValue: followUpRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: RedisService, useValue: redis },
        { provide: CustomerService, useValue: { extendProtection: jest.fn() } },
      ],
    }).compile()

    service = module.get<FollowUpService>(FollowUpService)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('create', () => {
    it('throws NotFoundException when customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.create(createDto, adminUser)).rejects.toThrow(NotFoundException)
      expect(followUpRepo.save).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException when SALES creates follow-up for non-owned customer', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))

      await expect(service.create(createDto, salesUser)).rejects.toThrow(ForbiddenException)
      expect(followUpRepo.save).not.toHaveBeenCalled()
    })

    it('allows SALES to create follow-up for owned customer', async () => {
      const followUp = makeFollowUp({ userId: salesUser.id })
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: salesUser.id }))
      followUpRepo.create.mockReturnValue(followUp)
      followUpRepo.save.mockResolvedValue(followUp)

      const result = await service.create(createDto, salesUser)

      expect(followUpRepo.create).toHaveBeenCalledWith({
        ...createDto,
        userId: salesUser.id,
      })
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:follow-ups:customer:10:*')
      expect(result.id).toBe(100)
    })

    it('allows ADMIN to create follow-up regardless of customer owner', async () => {
      const followUp = makeFollowUp({ userId: adminUser.id })
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))
      followUpRepo.create.mockReturnValue(followUp)
      followUpRepo.save.mockResolvedValue(followUp)

      await service.create(createDto, adminUser)

      expect(followUpRepo.create).toHaveBeenCalledWith({
        ...createDto,
        userId: adminUser.id,
      })
    })
  })

  describe('findByCustomer', () => {
    it('throws NotFoundException when customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.findByCustomer(999, { page: 1, pageSize: 20 }, adminUser)).rejects.toThrow(
        NotFoundException,
      )
      expect(followUpRepo.findAndCount).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when customer is deleted', async () => {
      // Service queries with deleted=false, so deleted customer resolves as not found.
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.findByCustomer(10, { page: 1, pageSize: 20 }, adminUser)).rejects.toThrow(
        NotFoundException,
      )
      expect(followUpRepo.findAndCount).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException when SALES reads non-owned customer follow-ups', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))

      await expect(service.findByCustomer(10, { page: 1, pageSize: 20 }, salesUser)).rejects.toThrow(
        ForbiddenException,
      )
      expect(followUpRepo.findAndCount).not.toHaveBeenCalled()
    })

    it('allows ADMIN to read follow-ups for any customer', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))
      redis.safeGet.mockResolvedValue(null)
      followUpRepo.findAndCount.mockResolvedValue([[makeFollowUp()], 1])

      const result = await service.findByCustomer(10, { page: 1, pageSize: 20 }, adminUser)

      expect(result.total).toBe(1)
      expect(followUpRepo.findAndCount).toHaveBeenCalled()
    })

    it('returns cached result on cache hit', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))
      const cached = { list: [makeFollowUp()], total: 1 }
      redis.safeGet.mockResolvedValue(JSON.stringify(cached))

      const result = await service.findByCustomer(10, { page: 1, pageSize: 20 }, adminUser)

      expect(result.total).toBe(1)
      expect(followUpRepo.findAndCount).not.toHaveBeenCalled()
    })

    it('queries repo and caches result on cache miss', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))
      const rows = [makeFollowUp()]
      redis.safeGet.mockResolvedValue(null)
      followUpRepo.findAndCount.mockResolvedValue([rows, 1])

      const result = await service.findByCustomer(
        10,
        { page: 2, pageSize: 10, type: FollowUpType.CALL },
        adminUser,
      )

      expect(followUpRepo.findAndCount).toHaveBeenCalledWith({
        where: { customerId: 10, type: FollowUpType.CALL },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      })
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('cache:follow-ups:customer:10:'),
        expect.any(String),
        60,
      )
      expect(result.list).toHaveLength(1)
    })

    it('supports empty paged result', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ id: 10, assignedUserId: 999 }))
      redis.safeGet.mockResolvedValue(null)
      followUpRepo.findAndCount.mockResolvedValue([[], 0])

      const result = await service.findByCustomer(10, { page: 3, pageSize: 5 }, adminUser)

      expect(followUpRepo.findAndCount).toHaveBeenCalledWith({
        where: { customerId: 10 },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 5,
      })
      expect(result).toEqual({ list: [], total: 0 })
    })
  })

  describe('findOne', () => {
    it('throws NotFoundException when follow-up does not exist', async () => {
      followUpRepo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('throws ForbiddenException when SALES updates non-owned follow-up', async () => {
      followUpRepo.findOne.mockResolvedValue(makeFollowUp({ userId: salesUser.id }))

      await expect(service.update(100, { content: 'x' }, otherSalesUser)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('throws BadRequestException when trying to change customerId', async () => {
      followUpRepo.findOne.mockResolvedValue(makeFollowUp({ customerId: 10 }))

      await expect(service.update(100, { customerId: 11 }, adminUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('updates follow-up and invalidates cache', async () => {
      const entity = makeFollowUp({ userId: adminUser.id, customerId: 10 })
      followUpRepo.findOne.mockResolvedValue(entity)
      followUpRepo.save.mockResolvedValue({ ...entity, content: 'updated' })

      const result = await service.update(100, { content: 'updated' }, adminUser)

      expect(followUpRepo.save).toHaveBeenCalledWith(expect.objectContaining({ content: 'updated' }))
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:follow-ups:customer:10:*')
      expect(result.content).toBe('updated')
    })
  })

  describe('remove', () => {
    it('throws ForbiddenException when SALES removes non-owned follow-up', async () => {
      followUpRepo.findOne.mockResolvedValue(makeFollowUp({ userId: salesUser.id }))

      await expect(service.remove(100, otherSalesUser)).rejects.toThrow(ForbiddenException)
    })

    it('soft deletes follow-up and invalidates cache', async () => {
      const entity = makeFollowUp({ userId: adminUser.id, customerId: 10 })
      followUpRepo.findOne.mockResolvedValue(entity)
      followUpRepo.softRemove.mockResolvedValue({ ...entity })

      await service.remove(100, adminUser)

      expect(followUpRepo.softRemove).toHaveBeenCalled()
      expect(redis.delByPattern).toHaveBeenCalledWith('cache:follow-ups:customer:10:*')
    })
  })
})
