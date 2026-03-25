import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { PaymentPlanService } from '../../src/modules/payment-tracking/payment-plan.service'
import { PaymentPlan } from '../../src/modules/payment-tracking/entities/payment-plan.entity'
import { PaymentPlanItem } from '../../src/modules/payment-tracking/entities/payment-plan-item.entity'
import { UserRole } from '@crm/shared'

describe('PaymentPlanService', () => {
  let service: PaymentPlanService
  let planRepo: Record<string, jest.Mock>
  let itemRepo: Record<string, jest.Mock>
  /** Single QB instance so assertions run on the same object the service used */
  let planQbMock: {
    andWhere: jest.Mock
    orderBy: jest.Mock
    skip: jest.Mock
    take: jest.Mock
    getManyAndCount: jest.Mock
  }
  const admin = { id: 1, role: UserRole.ADMIN, name: 'Admin' } as any
  const sales = { id: 2, role: UserRole.SALES, name: 'Sales' } as any

  beforeEach(async () => {
    planQbMock = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }
    planRepo = {
      create: jest.fn((d) => ({ id: 1, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 1, ...e })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => planQbMock),
    }
    const itemQbChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    }
    itemRepo = {
      create: jest.fn((d) => ({ id: 10, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 10, ...e })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn(() => itemQbChain),
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentPlanService,
        { provide: getRepositoryToken(PaymentPlan), useValue: planRepo },
        { provide: getRepositoryToken(PaymentPlanItem), useValue: itemRepo },
      ],
    }).compile()
    service = module.get(PaymentPlanService)
  })

  it('should create plan with equal split items', async () => {
    const result = await service.create({ contractId: 1, planName: 'Test', totalInstallments: 3, totalAmount: 9000, splitMethod: 'equal' }, admin)
    expect(planRepo.save).toHaveBeenCalled()
    expect(itemRepo.save).toHaveBeenCalledTimes(3)
  })

  it('should create plan with custom items', async () => {
    await service.create({ contractId: 1, planName: 'Custom', totalInstallments: 2, totalAmount: 5000, splitMethod: 'custom', items: [{ amount: 3000, dueDate: '2026-04-01' }, { amount: 2000, dueDate: '2026-05-01' }] }, admin)
    expect(itemRepo.save).toHaveBeenCalledTimes(2)
  })

  it('should handle equal split with remainder', async () => {
    await service.create({ contractId: 1, planName: 'Test', totalInstallments: 3, totalAmount: 10000, splitMethod: 'equal' }, admin)
    expect(itemRepo.save).toHaveBeenCalledTimes(3)
  })

  it('should return paginated list', async () => {
    const result = await service.findAll(1, 20, admin)
    expect(result).toEqual(expect.objectContaining({ list: [], total: 0 }))
  })

  it('should filter SALES by own plans', async () => {
    await service.findAll(1, 20, sales)
    expect(planRepo.createQueryBuilder).toHaveBeenCalledWith('pp')
    expect(planQbMock.andWhere).toHaveBeenCalledWith('pp.salesUserId = :uid', { uid: sales.id })
  })

  it('should findOne with items', async () => {
    planRepo.findOne.mockResolvedValue({ id: 1, salesUserId: 1 })
    const result = await service.findOne(1, admin)
    expect(result).toHaveProperty('items')
  })

  it('should throw not found for findOne', async () => {
    planRepo.findOne.mockResolvedValue(null)
    await expect(service.findOne(999, admin)).rejects.toThrow(NotFoundException)
  })

  it('should restrict SALES access in findOne', async () => {
    planRepo.findOne.mockResolvedValue({ id: 1, salesUserId: 99 })
    await expect(service.findOne(1, sales)).rejects.toThrow(ForbiddenException)
  })

  it('should confirm payment - paid', async () => {
    itemRepo.findOne
      .mockResolvedValueOnce({ id: 10, amount: 1000, paidAmount: 0, status: 'pending' })
      .mockResolvedValueOnce({ id: 10, amount: 1000, paidAmount: 1000, status: 'pending' })
    await service.confirmPayment(10, { paidAmount: 1000 }, admin)
    expect(itemRepo.createQueryBuilder).toHaveBeenCalled()
    expect(itemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }))
  })

  it('should confirm payment - partial', async () => {
    itemRepo.findOne
      .mockResolvedValueOnce({ id: 10, amount: 1000, paidAmount: 0, status: 'pending' })
      .mockResolvedValueOnce({ id: 10, amount: 1000, paidAmount: 500, status: 'pending' })
    await service.confirmPayment(10, { paidAmount: 500 }, admin)
    expect(itemRepo.createQueryBuilder).toHaveBeenCalled()
    expect(itemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'partial' }))
  })

  it('should reject SALES from confirming', async () => {
    itemRepo.findOne.mockResolvedValue({ id: 10 })
    await expect(service.confirmPayment(10, { paidAmount: 100 }, sales)).rejects.toThrow(ForbiddenException)
  })

  it('should mark bad debt', async () => {
    itemRepo.findOne.mockResolvedValue({ id: 10, status: 'overdue' })
    await service.markBadDebt(10, admin)
    expect(itemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'bad_debt' }))
  })

  it('should reject SALES from marking bad debt', async () => {
    await expect(service.markBadDebt(10, sales)).rejects.toThrow(ForbiddenException)
  })

  it('should return overdue items', async () => {
    const result = await service.getOverdueItems(1, 20)
    expect(result).toEqual(expect.objectContaining({ list: [], total: 0 }))
  })

  it('should throw not found for confirm on missing item', async () => {
    itemRepo.findOne.mockResolvedValue(null)
    await expect(service.confirmPayment(999, { paidAmount: 100 }, admin)).rejects.toThrow(NotFoundException)
  })
})
