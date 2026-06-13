import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { PostLoanService } from '../../src/modules/post-loan/post-loan.service'
import { PostLoan } from '../../src/modules/post-loan/entities/post-loan.entity'
import { RepaymentPlan } from '../../src/modules/post-loan/entities/repayment-plan.entity'
import { ContractService } from '../../src/modules/contract/contract.service'
import { PostLoanStatus, RepaymentStatus } from '@crm/shared'
import { createMockRepository, createMockQueryBuilder, fixtures } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('PostLoanService', () => {
  let service: PostLoanService
  let postLoanRepo: MockRepository<PostLoan>
  let repaymentPlanRepo: MockRepository<RepaymentPlan>
  let contractService: { findOne: jest.Mock }

  beforeEach(async () => {
    postLoanRepo = createMockRepository<PostLoan>()
    repaymentPlanRepo = createMockRepository<RepaymentPlan>()
    contractService = { findOne: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostLoanService,
        { provide: getRepositoryToken(PostLoan), useValue: postLoanRepo },
        { provide: getRepositoryToken(RepaymentPlan), useValue: repaymentPlanRepo },
        { provide: ContractService, useValue: contractService },
      ],
    }).compile()

    service = module.get(PostLoanService)
  })

  describe('create', () => {
    it('should create post-loan with repayment plans', async () => {
      const contract = fixtures.contract({ customerId: 10 })
      contractService.findOne.mockResolvedValue(contract)
      postLoanRepo.create.mockImplementation((data) => data)
      postLoanRepo.save.mockImplementation(async (entity) => ({ ...entity, id: 1 }))
      repaymentPlanRepo.create.mockImplementation((data) => data)
      repaymentPlanRepo.save.mockImplementation(async (entity) => entity)

      const result = await service.create(1, 12000, 3, '2025-01-01', 5)

      expect(result.id).toBe(1)
      expect(repaymentPlanRepo.save).toHaveBeenCalledTimes(3) // 3 periods
    })

    it('should set customerId from contract', async () => {
      const contract = fixtures.contract({ customerId: 42 })
      contractService.findOne.mockResolvedValue(contract)
      postLoanRepo.create.mockImplementation((data) => data)
      postLoanRepo.save.mockImplementation(async (entity) => ({ ...entity, id: 1 }))
      repaymentPlanRepo.create.mockImplementation((data) => data)
      repaymentPlanRepo.save.mockResolvedValue({})

      const result = await service.create(1, 10000, 1, '2025-01-01', 5)
      expect(postLoanRepo.create).toHaveBeenCalledWith(expect.objectContaining({ customerId: 42 }))
    })

    it('should generate equal repayment amounts', async () => {
      contractService.findOne.mockResolvedValue(fixtures.contract())
      postLoanRepo.create.mockImplementation((data) => data)
      postLoanRepo.save.mockImplementation(async (entity) => ({ ...entity, id: 1 }))
      const savedPlans: Record<string, unknown>[] = []
      repaymentPlanRepo.create.mockImplementation((data) => data)
      repaymentPlanRepo.save.mockImplementation(async (entity) => {
        savedPlans.push(entity)
        return entity
      })

      await service.create(1, 10000, 3, '2025-01-01', 5)

      // Sum should equal loan amount
      const totalAmount = savedPlans.reduce((sum: number, p: Record<string, unknown>) => sum + (p.amount as number), 0)
      expect(Math.round(totalAmount * 100) / 100).toBe(10000)
    })
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const qb = createMockQueryBuilder([{ id: 1 }], 1)
      postLoanRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 10 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder([], 0)
      postLoanRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ status: PostLoanStatus.OVERDUE })
      expect(qb.andWhere).toHaveBeenCalledWith('pl.status = :status', { status: PostLoanStatus.OVERDUE })
    })
  })

  describe('findOne', () => {
    it('should return post-loan by id', async () => {
      const pl = { id: 1, contractId: 1, status: PostLoanStatus.NORMAL }
      postLoanRepo.findOne.mockResolvedValue(pl)

      const result = await service.findOne(1)
      expect(result.id).toBe(1)
    })

    it('should throw NotFoundException', async () => {
      postLoanRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('confirmRepayment', () => {
    it('should mark plan as PAID when full amount', async () => {
      const plan = { id: 1, postLoanId: 1, amount: 5000, paidAmount: 0, status: RepaymentStatus.PENDING }
      repaymentPlanRepo.findOne.mockResolvedValue(plan)
      repaymentPlanRepo.save.mockImplementation(async (e) => e)
      repaymentPlanRepo.find.mockResolvedValue([
        { ...plan, status: RepaymentStatus.PAID },
      ])
      postLoanRepo.update.mockResolvedValue({})

      const result = await service.confirmRepayment(1, 5000, '2025-03-01')
      expect(result.status).toBe(RepaymentStatus.PAID)
    })

    it('should mark plan as PARTIAL when less than full amount', async () => {
      const plan = { id: 1, postLoanId: 1, amount: 5000, paidAmount: 0, status: RepaymentStatus.PENDING }
      repaymentPlanRepo.findOne.mockResolvedValue(plan)
      repaymentPlanRepo.save.mockImplementation(async (e) => e)
      repaymentPlanRepo.find.mockResolvedValue([plan])

      const result = await service.confirmRepayment(1, 3000, '2025-03-01')
      expect(result.status).toBe(RepaymentStatus.PARTIAL)
    })

    it('should settle post-loan when all plans paid', async () => {
      const plan = { id: 1, postLoanId: 1, amount: 5000, paidAmount: 0, status: RepaymentStatus.PENDING }
      repaymentPlanRepo.findOne.mockResolvedValue(plan)
      repaymentPlanRepo.save.mockImplementation(async (e) => e)
      repaymentPlanRepo.find.mockResolvedValue([
        { ...plan, status: RepaymentStatus.PAID },
      ])
      postLoanRepo.update.mockResolvedValue({})

      await service.confirmRepayment(1, 5000, '2025-03-01')
      expect(postLoanRepo.update).toHaveBeenCalledWith(1, { status: PostLoanStatus.SETTLED })
    })

    it('should throw NotFoundException for invalid plan', async () => {
      repaymentPlanRepo.findOne.mockResolvedValue(null)
      await expect(service.confirmRepayment(999, 5000, '2025-03-01')).rejects.toThrow(NotFoundException)
    })
  })

  describe('getOverdueList', () => {
    it('should return paginated overdue repayment plans', async () => {
      const qb = createMockQueryBuilder([{ id: 1, status: RepaymentStatus.PENDING }], 1)
      repaymentPlanRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getOverdueList(1, 10)
      expect(result.list).toHaveLength(1)
      expect(qb.andWhere).toHaveBeenCalledWith(
        'rp.status IN (:...statuses)',
        { statuses: [RepaymentStatus.PENDING, RepaymentStatus.PARTIAL] },
      )
    })
  })

  describe('getStatistics', () => {
    it('should return aggregate statistics', async () => {
      postLoanRepo.count.mockResolvedValue(10)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({
        totalAmount: '500000',
        normalCount: '7',
        overdueCount: '2',
        settledCount: '1',
      })
      postLoanRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics()
      expect(result.totalLoans).toBe(10)
      expect(result.totalAmount).toBe(500000)
      expect(result.normalCount).toBe(7)
      expect(result.overdueCount).toBe(2)
      expect(result.settledCount).toBe(1)
    })
  })

  describe('updateCreditRating', () => {
    it('should update credit rating', async () => {
      const pl = { id: 1, creditRating: null }
      postLoanRepo.findOne.mockResolvedValue(pl)
      postLoanRepo.save.mockImplementation(async (e) => e)

      const result = await service.updateCreditRating(1, 'AAA')
      expect(result.creditRating).toBe('AAA')
    })

    it('should reject invalid rating', async () => {
      postLoanRepo.findOne.mockResolvedValue({ id: 1 })
      await expect(service.updateCreditRating(1, '')).rejects.toThrow(BadRequestException)
    })
  })
})
