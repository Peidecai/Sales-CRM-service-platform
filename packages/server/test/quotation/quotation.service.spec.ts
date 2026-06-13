import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { QuotationService } from '../../src/modules/quotation/quotation.service'
import { Quotation } from '../../src/modules/quotation/entities/quotation.entity'
import { QuotationItem } from '../../src/modules/quotation/entities/quotation-item.entity'
import { UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

const salesUser: AuthUser = { id: 1, username: 'sales1', role: UserRole.SALES }

describe('QuotationService', () => {
  let service: QuotationService
  let quotationRepo: MockRepository<Quotation>
  let itemRepo: MockRepository<QuotationItem>

  beforeEach(async () => {
    quotationRepo = createMockRepository<Quotation>()
    itemRepo = createMockRepository<QuotationItem>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationService,
        { provide: getRepositoryToken(Quotation), useValue: quotationRepo },
        { provide: getRepositoryToken(QuotationItem), useValue: itemRepo },
      ],
    }).compile()

    service = module.get<QuotationService>(QuotationService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      title: 'New Quotation',
      opportunityId: 1,
      customerId: 1,
      validUntil: '2025-06-30',
      taxRate: 13,
      discountType: 'PERCENT' as const,
      discountValue: 10,
      items: [
        { productName: 'Widget A', quantity: 5, unitPrice: 2000, discountRate: 0 },
        { productName: 'Widget B', quantity: 10, unitPrice: 500, discountRate: 10 },
      ],
    }

    it('should create quotation with calculated amounts and items', async () => {
      const savedQuotation = fixtures.quotation({ id: 10 })
      const fullQuotation = { ...savedQuotation, items: [fixtures.quotationItem()] }

      quotationRepo.create.mockReturnValue(savedQuotation)
      quotationRepo.save.mockResolvedValue(savedQuotation)
      // findOne used after save to return with relations
      quotationRepo.findOne.mockResolvedValue(fullQuotation)
      itemRepo.create.mockImplementation((data) => data)
      itemRepo.save.mockResolvedValue([])

      const result = await service.create(dto as never, salesUser)

      expect(quotationRepo.create).toHaveBeenCalled()
      const createArg = quotationRepo.create.mock.calls[0][0]
      expect(createArg.quotationNo).toMatch(/^QUO-\d{8}-\d{4}$/)
      expect(createArg.ownerId).toBe(salesUser.id)
      expect(createArg.createdBy).toBe(salesUser.id)
      expect(typeof createArg.subtotal).toBe('number')
      expect(typeof createArg.totalAmount).toBe('number')
      expect(quotationRepo.save).toHaveBeenCalled()
      expect(itemRepo.create).toHaveBeenCalledTimes(2)
      expect(itemRepo.save).toHaveBeenCalled()
      expect(result).toEqual(fullQuotation)
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return paginated results with filters', async () => {
      const quotations = [fixtures.quotation()]
      const qb = createMockQueryBuilder(quotations, 1)
      quotationRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll(
        { page: 1, pageSize: 20, customerId: 1 } as never,
        salesUser,
      )

      expect(qb.andWhere).toHaveBeenCalledWith('q.customerId = :customerId', { customerId: 1 })
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result).toEqual({ list: quotations, total: 1, page: 1, pageSize: 20 })
    })

    it('should filter by keyword', async () => {
      const qb = createMockQueryBuilder([], 0)
      quotationRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 10, keyword: 'test' } as never, salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(q.title LIKE :kw OR q.quotationNo LIKE :kw)',
        { kw: '%test%' },
      )
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return a quotation with items', async () => {
      const quotation = fixtures.quotation({ items: [fixtures.quotationItem()] })
      quotationRepo.findOne.mockResolvedValue(quotation)

      const result = await service.findOne(1, salesUser)

      expect(quotationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['items'],
      })
      expect(result).toEqual(quotation)
    })

    it('should throw NotFoundException when not found', async () => {
      quotationRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999, salesUser)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update quotation fields without items', async () => {
      const existing = fixtures.quotation({ items: [] })
      const updated = { ...existing, title: 'Updated Quotation' }
      quotationRepo.findOne.mockResolvedValue(existing)
      quotationRepo.save.mockResolvedValue(updated)

      const result = await service.update(1, { title: 'Updated Quotation' } as never, salesUser)

      expect(quotationRepo.save).toHaveBeenCalled()
      expect(result.title).toBe('Updated Quotation')
    })

    it('should recalculate amounts when items are provided', async () => {
      const existing = fixtures.quotation({ items: [fixtures.quotationItem()] })
      quotationRepo.findOne.mockResolvedValue(existing)
      quotationRepo.save.mockImplementation(async (q) => q)
      itemRepo.delete.mockResolvedValue({ affected: 1 })
      itemRepo.create.mockImplementation((data) => data)
      itemRepo.save.mockResolvedValue([])

      const dto = {
        taxRate: 10,
        discountType: 'FIXED',
        discountValue: 500,
        items: [{ productName: 'New Widget', quantity: 3, unitPrice: 1000, discountRate: 0 }],
      }

      const result = await service.update(1, dto as never, salesUser)

      expect(itemRepo.delete).toHaveBeenCalledWith({ quotationId: 1 })
      expect(itemRepo.create).toHaveBeenCalledTimes(1)
      expect(itemRepo.save).toHaveBeenCalled()
      // subtotal = 3 * 1000 * (1 - 0/100) = 3000
      expect(result.subtotal).toBe(3000)
      // discountAmount = 500 (FIXED)
      expect(result.discountAmount).toBe(500)
      // taxAmount = (3000 - 500) * 10/100 = 250
      expect(result.taxAmount).toBe(250)
      // totalAmount = 2500 + 250 = 2750
      expect(result.totalAmount).toBe(2750)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-remove the quotation', async () => {
      const quotation = fixtures.quotation()
      quotationRepo.findOne.mockResolvedValue(quotation)
      quotationRepo.softRemove.mockResolvedValue(quotation)

      await service.remove(1, salesUser)

      expect(quotationRepo.softRemove).toHaveBeenCalledWith(quotation)
    })

    it('should throw NotFoundException when quotation not found', async () => {
      quotationRepo.findOne.mockResolvedValue(null)
      await expect(service.remove(999, salesUser)).rejects.toThrow(NotFoundException)
    })
  })
})
