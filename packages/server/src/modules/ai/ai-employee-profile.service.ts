import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'

export interface EmployeeRadarProfile {
  userId: number
  communication: number
  professionalism: number
  execution: number
  satisfaction: number
  closeRate: number
}

export interface GrowthPoint {
  month: string
  communication: number
  professionalism: number
  execution: number
  satisfaction: number
  closeRate: number
}

export interface BenchmarkComparison {
  userId: number
  user: EmployeeRadarProfile
  teamAverage: EmployeeRadarProfile
}

@Injectable()
export class AiEmployeeProfileService {
  private readonly logger = new Logger(AiEmployeeProfileService.name)

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /**
   * Get 5-dimension radar profile for a user.
   */
  async getProfile(userId: number): Promise<EmployeeRadarProfile> {
    // Communication: based on call record count and avg duration
    const callStats = await this.callRecordRepo
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'callCount')
      .addSelect('AVG(cr.duration)', 'avgDuration')
      .where('cr.userId = :userId', { userId })
      .andWhere('cr.createdAt > DATE_SUB(NOW(), INTERVAL 3 MONTH)')
      .getRawOne<{ callCount: string; avgDuration: string }>()

    const callCount = parseInt(callStats?.callCount ?? '0', 10)
    const avgDuration = parseFloat(callStats?.avgDuration ?? '0')

    // Close rate: won opportunities / total opportunities
    const oppStats = await this.opportunityRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN o.stage = :won THEN 1 ELSE 0 END)', 'wonCount')
      .where('o.assignedUserId = :userId', { userId })
      .setParameter('won', 'won')
      .getRawOne<{ total: string; wonCount: string }>()

    const totalOpp = parseInt(oppStats?.total ?? '0', 10)
    const wonCount = parseInt(oppStats?.wonCount ?? '0', 10)

    // Customer count for execution score
    const customerCount = await this.customerRepo.count({
      where: { assignedUserId: userId },
    })

    const communication = Math.min(
      100,
      Math.round((callCount / 50) * 60 + Math.min(avgDuration / 300, 1) * 40),
    )
    const closeRate = totalOpp > 0 ? Math.round((wonCount / totalOpp) * 100) : 0
    const execution = Math.min(100, Math.round((customerCount / 30) * 50 + (callCount / 100) * 50))
    const professionalism = Math.min(
      100,
      Math.round(
        avgDuration > 60
          ? 70 + Math.min((avgDuration - 60) / 240, 1) * 30
          : (avgDuration / 60) * 70,
      ),
    )
    const satisfaction = Math.min(100, Math.round(closeRate * 0.6 + communication * 0.4))

    return {
      userId,
      communication,
      professionalism,
      execution,
      satisfaction,
      closeRate,
    }
  }

  /**
   * Get monthly growth trend for a user.
   */
  async getGrowthCurve(userId: number, months: number): Promise<GrowthPoint[]> {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const callByMonth = await this.callRecordRepo
      .createQueryBuilder('cr')
      .select("DATE_FORMAT(cr.createdAt, '%Y-%m')", 'month')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('AVG(cr.duration)', 'avgDuration')
      .where('cr.userId = :userId', { userId })
      .andWhere('cr.createdAt >= :startDate', { startDate })
      .groupBy("DATE_FORMAT(cr.createdAt, '%Y-%m')")
      .getRawMany<{ month: string; callCount: string; avgDuration: string }>()

    const oppByMonth = await this.opportunityRepo
      .createQueryBuilder('o')
      .select("DATE_FORMAT(o.createdAt, '%Y-%m')", 'month')
      .addSelect('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN o.stage = 'won' THEN 1 ELSE 0 END)", 'wonCount')
      .where('o.assignedUserId = :userId', { userId })
      .andWhere('o.createdAt >= :startDate', { startDate })
      .groupBy("DATE_FORMAT(o.createdAt, '%Y-%m')")
      .getRawMany<{ month: string; total: string; wonCount: string }>()

    // Build month list
    const points: GrowthPoint[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      const call = callByMonth.find((c) => c.month === monthStr)
      const opp = oppByMonth.find((o) => o.month === monthStr)

      const callCount = parseInt(call?.callCount ?? '0', 10)
      const avgDuration = parseFloat(call?.avgDuration ?? '0')
      const totalOpp = parseInt(opp?.total ?? '0', 10)
      const wonCount = parseInt(opp?.wonCount ?? '0', 10)

      const communication = Math.min(
        100,
        Math.round((callCount / 20) * 60 + Math.min(avgDuration / 300, 1) * 40),
      )
      const closeRate = totalOpp > 0 ? Math.round((wonCount / totalOpp) * 100) : 0
      const professionalism = Math.min(
        100,
        Math.round(
          avgDuration > 60
            ? 70 + Math.min((avgDuration - 60) / 240, 1) * 30
            : (avgDuration / 60) * 70,
        ),
      )
      const execution = Math.min(100, Math.round((callCount / 30) * 100))
      const satisfaction = Math.min(100, Math.round(closeRate * 0.6 + communication * 0.4))

      points.push({
        month: monthStr,
        communication,
        professionalism,
        execution,
        satisfaction,
        closeRate,
      })
    }

    return points
  }

  /**
   * Compare user profile vs team average.
   */
  async compareBenchmark(userId: number): Promise<BenchmarkComparison> {
    const userProfile = await this.getProfile(userId)

    // Get team aggregates directly (3 queries instead of N*3)
    const teamCallStats = await this.callRecordRepo
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'callCount')
      .addSelect('AVG(cr.duration)', 'avgDuration')
      .where('cr.userId != :userId', { userId })
      .andWhere('cr.createdAt > DATE_SUB(NOW(), INTERVAL 3 MONTH)')
      .getRawOne<{ callCount: string; avgDuration: string }>()

    const teamOppStats = await this.opportunityRepo
      .createQueryBuilder('o')
      .select('COUNT(DISTINCT o.assignedUserId)', 'salesCount')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN o.stage = :won THEN 1 ELSE 0 END)', 'wonCount')
      .where('o.assignedUserId != :userId', { userId })
      .setParameter('won', 'won')
      .getRawOne<{ salesCount: string; total: string; wonCount: string }>()

    const teamCustomerCount = await this.customerRepo.count({
      where: { assignedUserId: Not(userId) },
    })

    const salesCount = parseInt(teamOppStats?.salesCount ?? '0', 10)

    if (salesCount === 0) {
      return {
        userId,
        user: userProfile,
        teamAverage: { ...userProfile },
      }
    }

    // Compute per-salesperson averages
    const avgCallCount = parseInt(teamCallStats?.callCount ?? '0', 10) / salesCount
    const avgDuration = parseFloat(teamCallStats?.avgDuration ?? '0')
    const avgTotalOpp = parseInt(teamOppStats?.total ?? '0', 10) / salesCount
    const avgWonCount = parseInt(teamOppStats?.wonCount ?? '0', 10) / salesCount
    const avgCustomerCount = teamCustomerCount / salesCount

    const communication = Math.min(
      100,
      Math.round((avgCallCount / 50) * 60 + Math.min(avgDuration / 300, 1) * 40),
    )
    const closeRate = avgTotalOpp > 0 ? Math.round((avgWonCount / avgTotalOpp) * 100) : 0
    const execution = Math.min(
      100,
      Math.round((avgCustomerCount / 30) * 50 + (avgCallCount / 100) * 50),
    )
    const professionalism = Math.min(
      100,
      Math.round(
        avgDuration > 60
          ? 70 + Math.min((avgDuration - 60) / 240, 1) * 30
          : (avgDuration / 60) * 70,
      ),
    )
    const satisfaction = Math.min(100, Math.round(closeRate * 0.6 + communication * 0.4))

    const teamAverage: EmployeeRadarProfile = {
      userId: 0,
      communication,
      professionalism,
      execution,
      satisfaction,
      closeRate,
    }

    return { userId, user: userProfile, teamAverage }
  }
}
