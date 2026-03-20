import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PaymentService } from '../../src/modules/payment/payment.service'
import { Payment } from '../../src/modules/payment/entities/payment.entity'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { PaymentStatus } from '@crm/shared'
import { createMockRepository, createMockQueryBuilder, type MockRepository, fixtures } from '../test-utils'

describe('PaymentService — Overdue & Statistics', () => {
  let service: PaymentService
  let repo: MockRepository<Payment>
  let notificationService: { notify: jest.Mock; notifyUser: jest.Mock }

  beforeEach(async () => {
    repo = createMockRepository<Payment>()
    notificationService = { notify: jest.fn(), notifyUser: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: repo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile()

    service = module.get(PaymentService)
  })

  describe('getOverdueList', () => {
    it('should return paginated overdue payments', async () => {
      const overduePayment = fixtures.payment({ isOverdue: true, overdueDays: 5 })
      const qb = createMockQueryBuilder([overduePayment], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getOverdueList(1, 10)
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(qb.andWhere).toHaveBeenCalledWith('p.status = :status', { status: PaymentStatus.PLANNED })
    })

    it('should use default pagination', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.getOverdueList()
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })
  })

  describe('getStatistics', () => {
    it('should return statistics with no filter', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({
        totalPlanned: '100000',
        totalReceived: '80000',
        overdueAmount: '10000',
      })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics({})
      expect(result.totalPlanned).toBe(100000)
      expect(result.totalReceived).toBe(80000)
      expect(result.overdueAmount).toBe(10000)
      expect(result.collectionRate).toBe(80)
      expect(result.overdueRate).toBe(10)
    })

    it('should handle zero total planned', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({
        totalPlanned: null,
        totalReceived: null,
        overdueAmount: null,
      })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics({})
      expect(result.overdueRate).toBe(0)
      expect(result.collectionRate).toBe(0)
    })

    it('should filter by date range', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalPlanned: '0', totalReceived: '0', overdueAmount: '0' })
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.getStatistics({ startDate: '2025-01-01', endDate: '2025-12-31' })
      expect(qb.andWhere).toHaveBeenCalledWith('p.plannedDate >= :startDate', { startDate: '2025-01-01' })
      expect(qb.andWhere).toHaveBeenCalledWith('p.plannedDate <= :endDate', { endDate: '2025-12-31' })
    })

    it('should filter by ownerId', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalPlanned: '0', totalReceived: '0', overdueAmount: '0' })
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.getStatistics({ ownerId: 5 })
      expect(qb.andWhere).toHaveBeenCalledWith('p.ownerId = :ownerId', { ownerId: 5 })
    })
  })

  describe('refreshOverdueStatus', () => {
    it('should update overdue status for planned payments past due', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 3)

      const payment = fixtures.payment({
        plannedDate: yesterday,
        isOverdue: false,
        overdueDays: 0,
        status: PaymentStatus.PLANNED,
      })

      const qb = createMockQueryBuilder([payment], 1)
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.save.mockImplementation(async (e) => e)

      const count = await service.refreshOverdueStatus()
      expect(count).toBe(1)
      expect(repo.save).toHaveBeenCalled()
    })

    it('should not update if already has correct overdue days', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const payment = fixtures.payment({
        plannedDate: yesterday,
        isOverdue: true,
        overdueDays: 1,
        status: PaymentStatus.PLANNED,
      })

      const qb = createMockQueryBuilder([payment], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const count = await service.refreshOverdueStatus()
      expect(count).toBe(0)
    })
  })

  describe('checkOverduePayments (cron)', () => {
    it('should refresh overdue status and notify for first-day overdue', async () => {
      const payment = fixtures.payment({
        overdueDays: 1,
        isOverdue: true,
        ownerId: 10,
        status: PaymentStatus.PLANNED,
      })

      // refreshOverdueStatus and getOverduePayments both use createQueryBuilder
      const qb = createMockQueryBuilder([payment], 1)
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.save.mockImplementation(async (e) => e)

      await service.checkOverduePayments()
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ resource: 'payment' }),
      )
    })
  })
})
