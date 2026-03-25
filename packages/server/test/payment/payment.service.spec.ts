import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { NotFoundException } from '@nestjs/common'
import { PaymentService } from '../../src/modules/payment/payment.service'
import { Payment } from '../../src/modules/payment/entities/payment.entity'
import { Contract } from '../../src/modules/contract/entities/contract.entity'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { PaymentStatus, PaymentMethod, UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockDataSource,
  fixtures,
  type MockRepository,
  type MockQueryBuilder,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

const adminUser: AuthUser = { id: 2, username: 'admin', role: UserRole.ADMIN }

describe('PaymentService', () => {
  let service: PaymentService
  let repo: MockRepository<Payment>
  let contractRepo: MockRepository<Contract>
  let mockDataSource: ReturnType<typeof createMockDataSource>

  beforeEach(async () => {
    repo = createMockRepository<Payment>()
    contractRepo = createMockRepository<Contract>()
    mockDataSource = createMockDataSource()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: repo },
        { provide: getRepositoryToken(Contract), useValue: contractRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationService, useValue: { notify: jest.fn(), notifyUser: jest.fn() } },
      ],
    }).compile()

    service = module.get<PaymentService>(PaymentService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      contractId: 1,
      customerId: 1,
      ownerId: 1,
      plannedAmount: 10000,
      plannedDate: '2025-03-15',
    }

    it('should create a payment with generated paymentNo', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      const payment = fixtures.payment()
      repo.create.mockReturnValue(payment)
      repo.save.mockResolvedValue(payment)

      const result = await service.create(dto as never, adminUser)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('p')
      expect(qb.getCount).toHaveBeenCalled()
      expect(repo.create).toHaveBeenCalled()
      const createArg = repo.create.mock.calls[0][0]
      expect(createArg.paymentNo).toMatch(/^PAY-\d{8}-\d{4}$/)
      expect(createArg.createdBy).toBe(adminUser.id)
      expect(createArg.status).toBe(PaymentStatus.PLANNED)
      expect(repo.save).toHaveBeenCalledWith(payment)
      expect(result).toEqual(payment)
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return paginated results with filters', async () => {
      const payments = [fixtures.payment(), fixtures.payment({ id: 2 })]
      const qb = createMockQueryBuilder(payments, 2)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        contractId: 1,
        status: PaymentStatus.PLANNED,
      } as never, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith('p.contractId = :contractId', { contractId: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('p.status = :status', { status: PaymentStatus.PLANNED })
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result).toEqual({ list: payments, total: 2, page: 1, pageSize: 20 })
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return a payment by id', async () => {
      const payment = fixtures.payment()
      repo.findOne.mockResolvedValue(payment)

      const result = await service.findOne(1)

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
      expect(result).toEqual(payment)
    })

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update and return the payment', async () => {
      const existing = fixtures.payment()
      const updated = { ...existing, remark: 'Updated remark' }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockResolvedValue(updated)

      const result = await service.update(1, { remark: 'Updated remark' } as never)

      expect(repo.save).toHaveBeenCalled()
      expect(result.remark).toBe('Updated remark')
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-remove the payment', async () => {
      const payment = fixtures.payment()
      repo.findOne.mockResolvedValue(payment)
      repo.softRemove.mockResolvedValue(payment)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(payment)
    })
  })

  /* ---------- confirmPayment ---------- */
  describe('confirmPayment', () => {
    it('should confirm payment with actual amount and method', async () => {
      const payment = fixtures.payment({ contractId: 1 })
      repo.findOne.mockResolvedValue(payment)

      const contract = fixtures.contract({ id: 1, paidAmount: 0, totalAmount: 50000, status: 'executing' })
      contractRepo.findOne.mockResolvedValue(contract)

      const dto = {
        actualAmount: 9800,
        actualDate: '2025-03-20',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        bankTransactionNo: 'TXN-001',
      }

      const result = await service.confirmPayment(1, dto as never, adminUser)

      expect(result.actualAmount).toBe(9800)
      expect(result.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER)
      expect(result.status).toBe(PaymentStatus.CONFIRMED)
      expect(result.confirmUserId).toBe(adminUser.id)
      expect(result.confirmedAt).toBeInstanceOf(Date)
      expect(result.bankTransactionNo).toBe('TXN-001')
    })
  })

  /* ---------- getOverduePayments ---------- */
  describe('getOverduePayments', () => {
    it('should return planned payments past their planned date', async () => {
      const overduePayments = [fixtures.payment({ isOverdue: true, overdueDays: 5 })]
      const qb = createMockQueryBuilder(overduePayments)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getOverduePayments()

      expect(qb.andWhere).toHaveBeenCalledWith('p.status = :status', { status: PaymentStatus.PLANNED })
      expect(qb.andWhere).toHaveBeenCalledWith('p.plannedDate < :today', expect.any(Object))
      expect(qb.getMany).toHaveBeenCalled()
      expect(result).toEqual(overduePayments)
    })
  })

  /* ---------- refreshOverdueStatus ---------- */
  describe('refreshOverdueStatus', () => {
    it('should update overdue flags and return count of updated records', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      const overduePayment = fixtures.payment({
        plannedDate: pastDate,
        isOverdue: false,
        overdueDays: 0,
      })
      const qb = createMockQueryBuilder([overduePayment])
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.save.mockImplementation(async (p) => p)

      const result = await service.refreshOverdueStatus()

      expect(result).toBe(1)
      expect(repo.save).toHaveBeenCalledTimes(1)
      const savedPayment = repo.save.mock.calls[0][0]
      expect(savedPayment.isOverdue).toBe(true)
      expect(savedPayment.overdueDays).toBeGreaterThanOrEqual(9)
    })
  })
})
