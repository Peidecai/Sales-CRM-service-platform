import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, LessThanOrEqual } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { Customer } from '../customer/customer.entity'
import { FollowUp } from '../follow-up/follow-up.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { OpportunityStage, UserRole } from '@crm/shared'

export interface DashboardStats {
  todayCalls: number
  todayCallsTrend: number
  newCustomers: number
  newCustomersTrend: number
  pendingFollowUps: number
  pendingFollowUpsTrend: number
  monthRevenue: number
  monthRevenueTrend: number
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
  ) {}

  async getStats(
    userId: number,
    role: UserRole,
    scope: 'personal' | 'team',
  ): Promise<DashboardStats> {
    const isPersonal = scope === 'personal' || role === UserRole.SALES

    const now = new Date()
    const todayStart = this.startOfDay(now)
    const todayEnd = this.endOfDay(now)
    const yesterdayStart = this.startOfDay(this.addDays(now, -1))
    const yesterdayEnd = this.endOfDay(this.addDays(now, -1))
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = this.endOfDay(now)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const [
      todayCalls,
      yesterdayCalls,
      newCustomers,
      yesterdayCustomers,
      pendingFollowUps,
      yesterdayPendingFollowUps,
      monthRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      this.countCalls(todayStart, todayEnd, isPersonal ? userId : undefined),
      this.countCalls(yesterdayStart, yesterdayEnd, isPersonal ? userId : undefined),
      this.countCustomers(todayStart, todayEnd, isPersonal ? userId : undefined),
      this.countCustomers(yesterdayStart, yesterdayEnd, isPersonal ? userId : undefined),
      this.countPendingFollowUps(todayEnd, isPersonal ? userId : undefined),
      this.countPendingFollowUps(yesterdayEnd, isPersonal ? userId : undefined),
      this.sumWonRevenue(monthStart, monthEnd, isPersonal ? userId : undefined),
      this.sumWonRevenue(lastMonthStart, lastMonthEnd, isPersonal ? userId : undefined),
    ])

    return {
      todayCalls,
      todayCallsTrend: this.calcTrend(todayCalls, yesterdayCalls),
      newCustomers,
      newCustomersTrend: this.calcTrend(newCustomers, yesterdayCustomers),
      pendingFollowUps,
      pendingFollowUpsTrend: this.calcTrend(pendingFollowUps, yesterdayPendingFollowUps),
      monthRevenue,
      monthRevenueTrend: this.calcTrend(monthRevenue, lastMonthRevenue),
    }
  }

  private calcTrend(current: number, previous: number): number {
    return Math.round(((current - previous) / Math.max(previous, 1)) * 100)
  }

  private async countCalls(start: Date, end: Date, userId?: number): Promise<number> {
    const where: Record<string, unknown> = { callAt: Between(start, end) }
    if (userId !== undefined) where.userId = userId
    return this.callRecordRepo.count({ where })
  }

  private async countCustomers(start: Date, end: Date, userId?: number): Promise<number> {
    const where: Record<string, unknown> = { createdAt: Between(start, end) }
    if (userId !== undefined) where.assignedUserId = userId
    return this.customerRepo.count({ where })
  }

  private async countPendingFollowUps(endDate: Date, userId?: number): Promise<number> {
    const where: Record<string, unknown> = {
      nextFollowUpDate: LessThanOrEqual(endDate),
    }
    if (userId !== undefined) where.userId = userId
    return this.followUpRepo.count({ where })
  }

  private async sumWonRevenue(start: Date, end: Date, userId?: number): Promise<number> {
    const qb = this.opportunityRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .where('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('o.updatedAt BETWEEN :start AND :end', { start, end })

    if (userId !== undefined) {
      qb.andWhere('o.assignedUserId = :userId', { userId })
    }

    const result = await qb.getRawOne<{ total: string }>()
    return Number(result?.total ?? 0)
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }
}
