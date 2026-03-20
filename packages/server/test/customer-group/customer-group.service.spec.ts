import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CustomerGroupService } from '../../src/modules/customer-group/customer-group.service'
import { CustomerGroup } from '../../src/modules/customer-group/entities/customer-group.entity'
import { CustomerGroupMember } from '../../src/modules/customer-group/entities/customer-group-member.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { UserRole, CustomerStatus } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
  type MockQueryBuilder,
} from '../test-utils'

describe('CustomerGroupService', () => {
  let service: CustomerGroupService
  let groupRepo: MockRepository
  let memberRepo: MockRepository
  let customerRepo: MockRepository
  let mockQb: MockQueryBuilder

  beforeEach(async () => {
    groupRepo = createMockRepository()
    memberRepo = createMockRepository()
    customerRepo = createMockRepository()
    mockQb = createMockQueryBuilder()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerGroupService,
        { provide: getRepositoryToken(CustomerGroup), useValue: groupRepo },
        { provide: getRepositoryToken(CustomerGroupMember), useValue: memberRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
      ],
    }).compile()

    service = module.get<CustomerGroupService>(CustomerGroupService)
  })

  const staticGroup = {
    id: 1,
    name: 'VIP客户',
    description: '重要客户',
    type: 'static' as const,
    rules: null,
    memberCount: 5,
    lastRefreshedAt: null,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  const dynamicGroup = {
    ...staticGroup,
    id: 2,
    name: 'IT行业',
    type: 'dynamic' as const,
    rules: [{ field: 'industry', operator: 'eq' as const, value: 'IT' }],
    lastRefreshedAt: new Date(),
  }

  describe('create', () => {
    it('should create a static group', async () => {
      groupRepo.create.mockReturnValue(staticGroup)
      groupRepo.save.mockResolvedValue(staticGroup)
      groupRepo.findOne.mockResolvedValue(staticGroup)

      const result = await service.create(
        { name: 'VIP客户', type: 'static' },
        1,
      )
      expect(result).toEqual(staticGroup)
      expect(groupRepo.create).toHaveBeenCalled()
    })

    it('should throw if dynamic group has no rules', async () => {
      await expect(
        service.create({ name: 'Test', type: 'dynamic' }, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('should create dynamic group and refresh', async () => {
      const customer = fixtures.customer({ industry: 'IT' })
      groupRepo.create.mockReturnValue(dynamicGroup)
      groupRepo.save.mockResolvedValue(dynamicGroup)
      groupRepo.findOne.mockResolvedValue(dynamicGroup)
      groupRepo.update.mockResolvedValue(undefined)

      // For refreshDynamic
      const refreshQb = createMockQueryBuilder([customer], 1)
      customerRepo.createQueryBuilder.mockReturnValue(refreshQb)
      memberRepo.delete.mockResolvedValue(undefined)
      const insertQb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }
      memberRepo.createQueryBuilder.mockReturnValue(insertQb)

      const result = await service.create(
        { name: 'IT行业', type: 'dynamic', rules: [{ field: 'industry', operator: 'eq', value: 'IT' }] },
        1,
      )
      expect(result.name).toBe('IT行业')
    })
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      groupRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([[staticGroup], 1])

      const result = await service.findAll(1, 20)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by userId for SALES role', async () => {
      groupRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([[], 0])

      await service.findAll(1, 20, 5, UserRole.SALES)
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'g.createdById = :userId',
        { userId: 5 },
      )
    })
  })

  describe('findOne', () => {
    it('should return group', async () => {
      groupRepo.findOne.mockResolvedValue(staticGroup)
      const result = await service.findOne(1)
      expect(result.name).toBe('VIP客户')
    })

    it('should throw NotFoundException', async () => {
      groupRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update group', async () => {
      const updated = { ...staticGroup, name: '新名称' }
      groupRepo.findOne.mockResolvedValue({ ...staticGroup })
      groupRepo.save.mockResolvedValue(updated)
      groupRepo.findOne.mockResolvedValue(updated)

      const result = await service.update(1, { name: '新名称' })
      expect(result.name).toBe('新名称')
    })
  })

  describe('remove', () => {
    it('should soft delete group and members', async () => {
      groupRepo.findOne.mockResolvedValue(staticGroup)
      memberRepo.softDelete.mockResolvedValue(undefined)
      groupRepo.softRemove.mockResolvedValue(undefined)

      await service.remove(1)
      expect(memberRepo.softDelete).toHaveBeenCalledWith({ groupId: 1 })
      expect(groupRepo.softRemove).toHaveBeenCalled()
    })
  })

  describe('addMembers', () => {
    it('should add members to static group', async () => {
      groupRepo.findOne.mockResolvedValue(staticGroup)
      const insertQb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }
      memberRepo.createQueryBuilder.mockReturnValue(insertQb)
      memberRepo.create.mockImplementation((data) => data)
      memberRepo.count.mockResolvedValue(7)
      groupRepo.update.mockResolvedValue(undefined)

      await service.addMembers(1, [10, 11])
      expect(insertQb.execute).toHaveBeenCalled()
      expect(groupRepo.update).toHaveBeenCalledWith(1, { memberCount: 7 })
    })

    it('should throw for dynamic group', async () => {
      groupRepo.findOne.mockResolvedValue(dynamicGroup)
      await expect(service.addMembers(2, [10])).rejects.toThrow(BadRequestException)
    })
  })

  describe('removeMembers', () => {
    it('should remove members from static group', async () => {
      groupRepo.findOne.mockResolvedValue(staticGroup)
      memberRepo.delete.mockResolvedValue(undefined)
      memberRepo.count.mockResolvedValue(3)
      groupRepo.update.mockResolvedValue(undefined)

      await service.removeMembers(1, [10, 11])
      expect(memberRepo.delete).toHaveBeenCalled()
    })

    it('should throw for dynamic group', async () => {
      groupRepo.findOne.mockResolvedValue(dynamicGroup)
      await expect(service.removeMembers(2, [10])).rejects.toThrow(BadRequestException)
    })
  })

  describe('getMembers', () => {
    it('should return members for static group', async () => {
      const customer = fixtures.customer()
      groupRepo.findOne.mockResolvedValue(staticGroup)
      customerRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([[customer], 1])

      const result = await service.getMembers(1, 1, 20)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should execute rules for dynamic group', async () => {
      const customer = fixtures.customer({ industry: 'IT' })
      groupRepo.findOne.mockResolvedValue(dynamicGroup)
      customerRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([[customer], 1])

      const result = await service.getMembers(2, 1, 20)
      expect(result.list).toHaveLength(1)
      expect(mockQb.andWhere).toHaveBeenCalled()
    })
  })

  describe('refreshDynamic', () => {
    it('should refresh dynamic group members', async () => {
      const customer = fixtures.customer()
      groupRepo.findOne.mockResolvedValue(dynamicGroup)
      const selectQb = createMockQueryBuilder([customer], 1)
      customerRepo.createQueryBuilder.mockReturnValue(selectQb)
      memberRepo.delete.mockResolvedValue(undefined)
      const insertQb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }
      memberRepo.createQueryBuilder.mockReturnValue(insertQb)
      groupRepo.update.mockResolvedValue(undefined)

      await service.refreshDynamic(2)
      expect(memberRepo.delete).toHaveBeenCalledWith({ groupId: 2 })
      expect(groupRepo.update).toHaveBeenCalled()
    })

    it('should skip if not dynamic', async () => {
      groupRepo.findOne.mockResolvedValue(staticGroup)
      await service.refreshDynamic(1)
      expect(memberRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('batchRefreshAll', () => {
    it('should refresh all dynamic groups', async () => {
      groupRepo.find.mockResolvedValue([dynamicGroup])
      groupRepo.findOne.mockResolvedValue(dynamicGroup)
      customerRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))
      memberRepo.delete.mockResolvedValue(undefined)
      groupRepo.update.mockResolvedValue(undefined)

      await service.batchRefreshAll()
      expect(groupRepo.find).toHaveBeenCalledWith({ where: { type: 'dynamic' } })
    })
  })

  describe('getAnalytics', () => {
    it('should return analytics', async () => {
      const customers = [
        fixtures.customer({ status: CustomerStatus.LEAD, industry: 'IT' }),
        fixtures.customer({ id: 2, status: CustomerStatus.DEAL, industry: 'Finance' }),
      ]
      groupRepo.findOne.mockResolvedValue(staticGroup)
      customerRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([customers, 2])

      const result = await service.getAnalytics(1)
      expect(result.memberCount).toBe(5)
      expect(result.statusDistribution[CustomerStatus.LEAD]).toBe(1)
      expect(result.industryDistribution['IT']).toBe(1)
    })
  })

  describe('batchAction', () => {
    it('should transfer customers', async () => {
      const customer = fixtures.customer()
      groupRepo.findOne.mockResolvedValue(staticGroup)
      customerRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([[customer], 1])
      customerRepo.update.mockResolvedValue(undefined)

      const result = await service.batchAction(1, 'transfer', { targetUserId: 5 }, 1)
      expect(result.affected).toBe(1)
      expect(customerRepo.update).toHaveBeenCalled()
    })

    it('should throw if transfer missing targetUserId', async () => {
      groupRepo.findOne.mockResolvedValue(staticGroup)
      customerRepo.createQueryBuilder.mockReturnValue(mockQb)
      mockQb.getManyAndCount.mockResolvedValue([[fixtures.customer()], 1])

      await expect(
        service.batchAction(1, 'transfer', {}, 1),
      ).rejects.toThrow(BadRequestException)
    })
  })
})
