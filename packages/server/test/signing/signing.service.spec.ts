import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { SigningService } from '../../src/modules/signing/signing.service'
import { SigningProcess } from '../../src/modules/signing/entities/signing-process.entity'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { UserRole } from '@crm/shared'

describe('SigningService', () => {
  let service: SigningService
  let signingRepo: Record<string, jest.Mock>
  let oppRepo: Record<string, jest.Mock>

  const admin = { id: 1, role: UserRole.ADMIN, name: 'Admin' } as any
  const sales = { id: 2, role: UserRole.SALES, name: 'Sales' } as any

  beforeEach(async () => {
    signingRepo = {
      create: jest.fn((d) => ({ id: 1, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 1, ...e })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getCount: jest.fn().mockResolvedValue(10),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: 5, totalAmount: 10000 }),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    }
    oppRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, title: 'Test Opp' }) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SigningService,
        { provide: getRepositoryToken(SigningProcess), useValue: signingRepo },
        { provide: getRepositoryToken(Opportunity), useValue: oppRepo },
      ],
    }).compile()
    service = module.get(SigningService)
  })

  describe('create', () => {
    it('should create a signing process', async () => {
      const result = await service.create({ opportunityId: 1, amount: 10000 }, admin)
      expect(signingRepo.create).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: 1, status: 'draft' }))
      expect(result).toBeDefined()
    })

    it('should throw if opportunity not found', async () => {
      oppRepo.findOne.mockResolvedValue(null)
      await expect(service.create({ opportunityId: 999, amount: 1000 }, admin)).rejects.toThrow(NotFoundException)
    })

    it('should set salesUserId to current user', async () => {
      await service.create({ opportunityId: 1, amount: 5000 }, sales)
      expect(signingRepo.create).toHaveBeenCalledWith(expect.objectContaining({ salesUserId: sales.id }))
    })
  })

  describe('findOne', () => {
    it('should return signing process', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, salesUserId: 1, status: 'draft' })
      const result = await service.findOne(1, admin)
      expect(result.id).toBe(1)
    })

    it('should throw if not found', async () => {
      signingRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999, admin)).rejects.toThrow(NotFoundException)
    })

    it('should restrict SALES to own processes', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, salesUserId: 99 })
      await expect(service.findOne(1, sales)).rejects.toThrow(ForbiddenException)
    })

    it('should allow SALES to view own process', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, salesUserId: sales.id })
      const result = await service.findOne(1, sales)
      expect(result).toBeDefined()
    })
  })

  describe('updateStatus', () => {
    it('should transition draft to internal_review', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'draft', salesUserId: admin.id })
      const result = await service.updateStatus(1, { status: 'internal_review' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'internal_review' }))
    })

    it('should reject invalid transition', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'draft', salesUserId: admin.id })
      await expect(service.updateStatus(1, { status: 'completed' }, admin)).rejects.toThrow(BadRequestException)
    })

    it('should set sentAt when sent_to_customer', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'internal_review', salesUserId: admin.id })
      await service.updateStatus(1, { status: 'sent_to_customer' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ sentAt: expect.any(Date) }))
    })

    it('should set signedAt when customer_signed', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'sent_to_customer', salesUserId: admin.id })
      await service.updateStatus(1, { status: 'customer_signed' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ signedAt: expect.any(Date) }))
    })

    it('should set completedAt when completed', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'customer_signed', salesUserId: admin.id })
      await service.updateStatus(1, { status: 'completed' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ completedAt: expect.any(Date) }))
    })

    it('should allow cancellation from most states', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'internal_review', salesUserId: admin.id })
      await service.updateStatus(1, { status: 'cancelled' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
    })

    it('should not allow transition from completed', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'completed', salesUserId: admin.id })
      await expect(service.updateStatus(1, { status: 'draft' }, admin)).rejects.toThrow(BadRequestException)
    })

    it('should allow reactivation from cancelled', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'cancelled', salesUserId: admin.id })
      await service.updateStatus(1, { status: 'draft' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
    })

    it('should save externalSignId if provided', async () => {
      signingRepo.findOne.mockResolvedValue({ id: 1, status: 'sent_to_customer', salesUserId: admin.id })
      await service.updateStatus(1, { status: 'customer_signed', externalSignId: 'ext-123' }, admin)
      expect(signingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ externalSignId: 'ext-123' }))
    })
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const result = await service.findAll({ page: 1, pageSize: 20 }, admin)
      expect(result).toEqual(expect.objectContaining({ list: [], total: 0, page: 1 }))
    })

    it('should filter by status', async () => {
      await service.findAll({ status: 'draft', page: 1, pageSize: 20 }, admin)
      const qb = signingRepo.createQueryBuilder()
      expect(qb.andWhere).toHaveBeenCalled()
    })
  })

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const result = await service.getStatistics()
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('completed')
      expect(result).toHaveProperty('conversionRate')
    })
  })

  describe('getRanking', () => {
    it('should return ranking by month', async () => {
      const result = await service.getRanking('month', 10)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should support day period', async () => {
      await service.getRanking('day', 5)
      expect(signingRepo.createQueryBuilder).toHaveBeenCalled()
    })

    it('should support week period', async () => {
      await service.getRanking('week', 5)
      expect(signingRepo.createQueryBuilder).toHaveBeenCalled()
    })
  })
})
