import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'
import { EmployeeBadge } from './entities/employee-badge.entity'
import { AiService } from './ai.service'
import { User } from '../user/user.entity'

export interface EmployeeRadarProfile {
  userId: number
  communication: number
  professionalism: number
  execution: number
  satisfaction: number
  closeRate: number
  /** 6th dimension: solution ability */
  solutionAbility: number
}

export interface GrowthPoint {
  month: string
  communication: number
  professionalism: number
  execution: number
  satisfaction: number
  closeRate: number
  solutionAbility: number
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
    @InjectRepository(EmployeeBadge)
    private readonly badgeRepo: Repository<EmployeeBadge>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly aiService: AiService,
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

    // 6th dimension: solution ability — based on avg deal value and close complexity
    const solutionAbility = Math.min(
      100,
      Math.round(
        (closeRate > 0 ? 40 : 0) +
          Math.min(professionalism * 0.3, 30) +
          Math.min(execution * 0.3, 30),
      ),
    )

    return {
      userId,
      communication,
      professionalism,
      execution,
      satisfaction,
      closeRate,
      solutionAbility,
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
      const solutionAbility = Math.min(
        100,
        Math.round(
          (closeRate > 0 ? 40 : 0) +
            Math.min(professionalism * 0.3, 30) +
            Math.min(execution * 0.3, 30),
        ),
      )

      points.push({
        month: monthStr,
        communication,
        professionalism,
        execution,
        satisfaction,
        closeRate,
        solutionAbility,
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
      solutionAbility: Math.min(
        100,
        Math.round(
          (closeRate > 0 ? 40 : 0) +
            Math.min(professionalism * 0.3, 30) +
            Math.min(execution * 0.3, 30),
        ),
      ),
    }

    return { userId, user: userProfile, teamAverage }
  }

  /**
   * Generate AI narrative for a user's monthly performance.
   */
  async generateNarrative(userId: number, month?: string): Promise<string> {
    const targetMonth =
      month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const profile = await this.getProfile(userId)
    const user = await this.userRepo.findOne({ where: { id: userId } })

    const systemPrompt = `你是销售团队管理专家。根据员工的6维雷达数据，生成一段50-100字的月度AI点评。
要求：客观、鼓励性、指出亮点和改进方向。只返回纯文本点评。`

    const context = `员工: ${user?.name ?? `用户${userId}`}
月份: ${targetMonth}
沟通能力: ${profile.communication}/100
专业知识: ${profile.professionalism}/100
执行力: ${profile.execution}/100
客户满意度: ${profile.satisfaction}/100
成单率: ${profile.closeRate}/100
解决方案: ${profile.solutionAbility}/100`

    try {
      return await this.aiService.chat(systemPrompt, context, { temperature: 0.5, maxTokens: 256 })
    } catch (err) {
      this.logger.warn(`Narrative generation failed for user #${userId}: ${String(err)}`)
      const strongest = Object.entries(profile)
        .filter(([k]) => k !== 'userId')
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0]
      return `${user?.name ?? '该员工'}本月综合表现稳定，${strongest[0]}维度表现最为突出。建议持续保持优势，关注其他维度的提升。`
    }
  }

  /**
   * Get achievements/badges for a user.
   */
  async getAchievements(userId: number): Promise<EmployeeBadge[]> {
    return this.badgeRepo.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    })
  }

  /**
   * Compute and award badges based on profile thresholds.
   */
  async computeAndAwardBadges(userId: number, month: string): Promise<EmployeeBadge[]> {
    const profile = await this.getProfile(userId)
    const badgeDefs: { type: string; check: () => boolean }[] = [
      { type: '电话精英', check: () => profile.communication >= 80 },
      { type: '知识达人', check: () => profile.professionalism >= 80 },
      { type: '执行力王', check: () => profile.execution >= 80 },
      { type: '满意之星', check: () => profile.satisfaction >= 80 },
      { type: '成单高手', check: () => profile.closeRate >= 50 },
      { type: '方案专家', check: () => profile.solutionAbility >= 80 },
    ]

    const newBadges: EmployeeBadge[] = []
    for (const def of badgeDefs) {
      if (!def.check()) continue
      // Check if already awarded for this month
      const existing = await this.badgeRepo.findOne({
        where: { userId, badgeType: def.type, month },
      })
      if (existing) continue

      const badge = this.badgeRepo.create({
        userId,
        badgeType: def.type,
        earnedAt: new Date(),
        month,
      })
      newBadges.push(await this.badgeRepo.save(badge))
    }
    return newBadges
  }

  /**
   * Get paginated portrait cards for all employees.
   */
  async getPortraitCards(
    page = 1,
    pageSize = 20,
    month?: string,
  ): Promise<{
    list: Array<{
      userId: number
      userName: string
      profile: EmployeeRadarProfile
      badges: EmployeeBadge[]
      narrative: string
    }>
    total: number
  }> {
    const [users, total] = await this.userRepo.findAndCount({
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const targetMonth =
      month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    const list = await Promise.all(
      users.map(async (u) => {
        const profile = await this.getProfile(u.id)
        // Auto-award badges for the target month
        await this.computeAndAwardBadges(u.id, targetMonth).catch(() => {})
        const badges = await this.getAchievements(u.id)
        let narrative = ''
        try {
          narrative = await this.generateNarrative(u.id, month)
        } catch {
          narrative = '暂无AI点评'
        }
        return {
          userId: u.id,
          userName: u.name ?? u.username,
          profile,
          badges,
          narrative,
        }
      }),
    )

    return { list, total }
  }
}
