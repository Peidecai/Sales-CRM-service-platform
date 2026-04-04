import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PostLoanStatus, RepaymentStatus } from '@crm/shared'
import type { PageResult } from '@crm/shared'
import { PostLoan } from './entities/post-loan.entity'
import { RepaymentPlan } from './entities/repayment-plan.entity'
import { ContractService } from '../contract/contract.service'
import { QueryPostLoanDto } from './dto/query-post-loan.dto'

@Injectable()
export class PostLoanService {
  constructor(
    @InjectRepository(PostLoan)
    private readonly postLoanRepository: Repository<PostLoan>,
    @InjectRepository(RepaymentPlan)
    private readonly repaymentPlanRepository: Repository<RepaymentPlan>,
    private readonly contractService: ContractService,
  ) {}

  async create(
    contractId: number,
    loanAmount: number,
    repaymentCount: number,
    disbursedAt: string,
    userId: number,
  ): Promise<PostLoan> {
    const contract = await this.contractService.findOne(contractId)

    const postLoan = this.postLoanRepository.create({
      contractId,
      customerId: contract.customerId,
      loanAmount,
      disbursedAt: new Date(disbursedAt),
      status: PostLoanStatus.NORMAL,
      createdBy: userId,
    })
    const saved = await this.postLoanRepository.save(postLoan)

    // Generate equal repayment plans
    const amountPerPeriod = Math.round((loanAmount / repaymentCount) * 100) / 100
    const startDate = new Date(disbursedAt)

    for (let i = 1; i <= repaymentCount; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      // Last period gets remainder
      const periodAmount =
        i === repaymentCount
          ? Math.round((loanAmount - amountPerPeriod * (repaymentCount - 1)) * 100) / 100
          : amountPerPeriod

      const plan = this.repaymentPlanRepository.create({
        postLoanId: saved.id,
        period: i,
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: periodAmount,
        paidAmount: 0,
        status: RepaymentStatus.PENDING,
      })
      await this.repaymentPlanRepository.save(plan)
    }

    return saved
  }

  async findAll(query: QueryPostLoanDto): Promise<PageResult<PostLoan>> {
    const { page = 1, pageSize = 20, status } = query
    const qb = this.postLoanRepository.createQueryBuilder('pl')

    if (status) {
      qb.andWhere('pl.status = :status', { status })
    }

    qb.orderBy('pl.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<PostLoan> {
    const postLoan = await this.postLoanRepository.findOne({ where: { id } })
    if (!postLoan) throw new NotFoundException(`PostLoan ${id} not found`)
    return postLoan
  }

  async getRepaymentPlans(postLoanId: number): Promise<RepaymentPlan[]> {
    return this.repaymentPlanRepository.find({
      where: { postLoanId },
      order: { period: 'ASC' },
    })
  }

  async confirmRepayment(
    planId: number,
    paidAmount: number,
    paidAt: string,
  ): Promise<RepaymentPlan> {
    const plan = await this.repaymentPlanRepository.findOne({ where: { id: planId } })
    if (!plan) throw new NotFoundException(`RepaymentPlan ${planId} not found`)

    plan.paidAmount = paidAmount
    plan.paidAt = new Date(paidAt)

    if (paidAmount >= plan.amount) {
      plan.status = RepaymentStatus.PAID
    } else {
      plan.status = RepaymentStatus.PARTIAL
    }

    const saved = await this.repaymentPlanRepository.save(plan)

    // Check if all plans are paid → settle the post-loan
    const allPlans = await this.repaymentPlanRepository.find({
      where: { postLoanId: plan.postLoanId },
    })
    const allPaid = allPlans.every((p) => p.status === RepaymentStatus.PAID)
    if (allPaid) {
      await this.postLoanRepository.update(plan.postLoanId, { status: PostLoanStatus.SETTLED })
    }

    return saved
  }

  async getOverdueList(page = 1, pageSize = 20): Promise<PageResult<RepaymentPlan>> {
    const today = new Date().toISOString().slice(0, 10)

    const qb = this.repaymentPlanRepository
      .createQueryBuilder('rp')
      .andWhere('rp.status IN (:...statuses)', {
        statuses: [RepaymentStatus.PENDING, RepaymentStatus.PARTIAL],
      })
      .andWhere('rp.due_date < :today', { today })
      .orderBy('rp.dueDate', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async getStatistics(): Promise<{
    totalLoans: number
    totalAmount: number
    normalCount: number
    overdueCount: number
    settledCount: number
  }> {
    const totalLoans = await this.postLoanRepository.count()

    const raw = await this.postLoanRepository
      .createQueryBuilder('pl')
      .select('SUM(pl.loan_amount)', 'totalAmount')
      .addSelect('SUM(CASE WHEN pl.status = :normal THEN 1 ELSE 0 END)', 'normalCount')
      .addSelect('SUM(CASE WHEN pl.status = :overdue THEN 1 ELSE 0 END)', 'overdueCount')
      .addSelect('SUM(CASE WHEN pl.status = :settled THEN 1 ELSE 0 END)', 'settledCount')
      .setParameter('normal', PostLoanStatus.NORMAL)
      .setParameter('overdue', PostLoanStatus.OVERDUE)
      .setParameter('settled', PostLoanStatus.SETTLED)
      .getRawOne()

    return {
      totalLoans,
      totalAmount: parseFloat(raw?.totalAmount) || 0,
      normalCount: parseInt(raw?.normalCount) || 0,
      overdueCount: parseInt(raw?.overdueCount) || 0,
      settledCount: parseInt(raw?.settledCount) || 0,
    }
  }

  async updateCreditRating(postLoanId: number, creditRating: string): Promise<PostLoan> {
    const postLoan = await this.findOne(postLoanId)
    if (!creditRating || creditRating.length > 10) {
      throw new BadRequestException('信用评级不合法')
    }
    postLoan.creditRating = creditRating
    return this.postLoanRepository.save(postLoan)
  }
}
