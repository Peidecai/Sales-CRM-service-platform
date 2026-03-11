import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  TargetScope,
  TargetPeriod,
  TargetMetricType,
  UserRole,
  OpportunityStage,
} from '@crm/shared'
import type { PageResult } from '@crm/shared'
import { SalesTarget } from './sales-target.entity'
import { PerformanceRanking } from './performance-ranking.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { User } from '../user/user.entity'
import { CreateSalesTargetDto } from './dto/create-sales-target.dto'
import { UpdateSalesTargetDto } from './dto/update-sales-target.dto'
import { QuerySalesTargetDto } from './dto/query-sales-target.dto'
import { DecomposeTargetDto } from './dto/decompose-target.dto'
import { RedisService, CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

export interface AchievementInfo {
  target: SalesTarget
  achievementRate: number
  remainingValue: number
  daysLeft: number
  dailyRequired: number
}

export interface ForecastInfo {
  target: SalesTarget
  achievementRate: number
  forecastValue: number
  forecastRate: number
  onTrack: boolean
}

@Injectable()
export class SalesTargetService {
  constructor(
    @InjectRepository(SalesTarget)
    private readonly targetRepository: Repository<SalesTarget>,
    @InjectRepository(PerformanceRanking)
    private readonly rankingRepository: Repository<PerformanceRanking>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateSalesTargetDto): Promise<SalesTarget> {
    const target = this.targetRepository.create({
      ...dto,
      achievedValue: 0,
    })
    const saved = await this.targetRepository.save(target)
    await this.invalidateTargetCache()
    return saved
  }

  async findAll(query: QuerySalesTargetDto, user: AuthUser): Promise<PageResult<SalesTarget>> {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      scope,
      period,
      metricType,
      year,
      assignedUserId,
    } = query

    const qb = this.targetRepository
      .createQueryBuilder('target')
      .where('target.deleted = :deleted', { deleted: false })

    // SALES users can only see their own individual targets or company/team targets
    if (user.role === UserRole.SALES) {
      qb.andWhere('(target.scope != :indScope OR target.assignedUserId = :uid)', {
        indScope: TargetScope.INDIVIDUAL,
        uid: user.id,
      })
    }

    if (keyword) {
      qb.andWhere('target.name LIKE :kw', { kw: `%${keyword}%` })
    }
    if (scope) {
      qb.andWhere('target.scope = :scope', { scope })
    }
    if (period) {
      qb.andWhere('target.period = :period', { period })
    }
    if (metricType) {
      qb.andWhere('target.metricType = :metricType', { metricType })
    }
    if (year) {
      qb.andWhere('target.year = :year', { year })
    }
    if (assignedUserId && user.role !== UserRole.SALES) {
      qb.andWhere('target.assignedUserId = :assignedUserId', { assignedUserId })
    }

    qb.orderBy('target.year', 'DESC')
      .addOrderBy('target.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number, user?: AuthUser): Promise<SalesTarget> {
    const target = await this.targetRepository.findOne({
      where: { id, deleted: false },
      relations: ['children'],
    })
    if (!target) {
      throw new NotFoundException(`Sales target with ID ${id} not found`)
    }
    this.checkTargetAccess(target, user)
    return target
  }

  async update(id: number, dto: UpdateSalesTargetDto): Promise<SalesTarget> {
    const target = await this.findOne(id)
    Object.assign(target, dto)
    const saved = await this.targetRepository.save(target)
    await this.invalidateTargetCache()
    return saved
  }

  async remove(id: number): Promise<void> {
    const target = await this.findOne(id)
    target.deleted = true
    await this.targetRepository.save(target)
    await this.invalidateTargetCache()
  }

  // ─── Decompose (split target to team/individual) ────────────────────

  async decompose(id: number, dto: DecomposeTargetDto): Promise<SalesTarget[]> {
    const parent = await this.findOne(id)

    // Validate total doesn't exceed parent
    const totalAllocated = dto.items.reduce((sum, item) => sum + item.targetValue, 0)
    if (totalAllocated > Number(parent.targetValue) * 1.001) {
      throw new BadRequestException(`分解总值 ${totalAllocated} 超过父目标值 ${parent.targetValue}`)
    }

    // Determine child scope
    const childScope =
      parent.scope === TargetScope.COMPANY ? TargetScope.TEAM : TargetScope.INDIVIDUAL

    const children: SalesTarget[] = []
    for (const item of dto.items) {
      const childName = item.assignedUserId
        ? `${parent.name} - 个人分解`
        : `${parent.name} - 团队分解`

      const child = this.targetRepository.create({
        name: childName,
        scope: childScope,
        period: parent.period,
        metricType: parent.metricType,
        targetValue: item.targetValue,
        achievedValue: 0,
        year: parent.year,
        quarter: parent.quarter,
        month: parent.month,
        startDate: parent.startDate,
        endDate: parent.endDate,
        assignedUserId: item.assignedUserId ?? null,
        teamId: item.teamId ?? null,
        parentTargetId: parent.id,
      })
      children.push(child)
    }

    const saved = await this.targetRepository.save(children)
    await this.invalidateTargetCache()
    return saved
  }

  // ─── Achievement status ──────────────────────────────────────────────

  async getAchievement(id: number, user?: AuthUser): Promise<AchievementInfo> {
    const target = await this.findOne(id, user)
    const targetVal = Number(target.targetValue)
    const achievedVal = Number(target.achievedValue)
    const achievementRate = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0
    const remainingValue = Math.max(0, targetVal - achievedVal)

    const now = new Date()
    const endDate = new Date(target.endDate)
    const daysLeft = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    )
    const dailyRequired = daysLeft > 0 ? remainingValue / daysLeft : remainingValue

    return { target, achievementRate, remainingValue, daysLeft, dailyRequired }
  }

  // ─── Forecast ─────────────────────────────────────────────────────────

  async getForecast(id: number, user?: AuthUser): Promise<ForecastInfo> {
    const target = await this.findOne(id, user)
    const targetVal = Number(target.targetValue)
    const achievedVal = Number(target.achievedValue)
    const achievementRate = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0

    const startDate = new Date(target.startDate)
    const endDate = new Date(target.endDate)
    const now = new Date()

    const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const elapsedDays = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const dailyRate = achievedVal / elapsedDays
    const forecastValue = dailyRate * totalDays
    const forecastRate = targetVal > 0 ? (forecastValue / targetVal) * 100 : 0

    return {
      target,
      achievementRate,
      forecastValue: Math.round(forecastValue * 100) / 100,
      forecastRate: Math.round(forecastRate * 100) / 100,
      onTrack: forecastRate >= 100,
    }
  }

  // ─── Rankings ─────────────────────────────────────────────────────────

  async getSalesRanking(
    metricType: TargetMetricType,
    period: TargetPeriod,
    year: number,
    quarter?: number,
    month?: number,
    limit = 10,
  ): Promise<PerformanceRanking[]> {
    const qb = this.rankingRepository
      .createQueryBuilder('r')
      .where('r.period = :period', { period })
      .andWhere('r.metricType = :metricType', { metricType })
      .andWhere('r.year = :year', { year })

    if (quarter) {
      qb.andWhere('r.quarter = :quarter', { quarter })
    }
    if (month) {
      qb.andWhere('r.month = :month', { month })
    }

    qb.orderBy('r.rank', 'ASC').take(limit)
    return qb.getMany()
  }

  async getTeamRanking(
    metricType: TargetMetricType,
    year: number,
    quarter?: number,
  ): Promise<Array<{ teamId: string; totalValue: number; rank: number }>> {
    const qb = this.targetRepository
      .createQueryBuilder('t')
      .select('t.team_id', 'teamId')
      .addSelect('SUM(t.achieved_value)', 'totalValue')
      .where('t.deleted = :deleted', { deleted: false })
      .andWhere('t.scope = :scope', { scope: TargetScope.TEAM })
      .andWhere('t.metricType = :metricType', { metricType })
      .andWhere('t.year = :year', { year })
      .groupBy('t.team_id')
      .orderBy('totalValue', 'DESC')

    if (quarter) {
      qb.andWhere('t.quarter = :quarter', { quarter })
    }

    const rows = await qb.getRawMany<{ teamId: string; totalValue: string }>()
    return rows.map((row, idx) => ({
      teamId: row.teamId,
      totalValue: Number(row.totalValue) || 0,
      rank: idx + 1,
    }))
  }

  async getRankingTrend(
    userId: number,
    metricType: TargetMetricType,
    year: number,
  ): Promise<PerformanceRanking[]> {
    return this.rankingRepository.find({
      where: {
        userId,
        metricType,
        year,
      },
      order: { snapshotDate: 'ASC' },
    })
  }

  // ─── Achievement Auto-Update (called by cron) ────────────────────────

  async updateAllAchievements(): Promise<number> {
    const now = new Date()
    const targets = await this.targetRepository.find({
      where: { deleted: false },
    })

    let updated = 0
    for (const target of targets) {
      const endDate = new Date(target.endDate)
      if (endDate < now && Number(target.achievedValue) > 0) continue // Past target already filled

      const newValue = await this.computeAchievedValue(target)
      if (Number(newValue) !== Number(target.achievedValue)) {
        target.achievedValue = newValue
        await this.targetRepository.save(target)
        updated++
      }
    }

    if (updated > 0) {
      await this.invalidateTargetCache()
    }
    return updated
  }

  async computeAchievedValue(target: SalesTarget): Promise<number> {
    const startDate = new Date(target.startDate)
    const endDate = new Date(target.endDate)

    switch (target.metricType) {
      case TargetMetricType.REVENUE:
        return this.computeRevenue(target, startDate, endDate)
      case TargetMetricType.DEAL_COUNT:
        return this.computeDealCount(target, startDate, endDate)
      case TargetMetricType.NEW_CUSTOMER:
        return this.computeNewCustomerCount(target, startDate, endDate)
      case TargetMetricType.CALL_COUNT:
        return this.computeCallCount(target, startDate, endDate)
      default:
        return 0
    }
  }

  private async computeRevenue(target: SalesTarget, start: Date, end: Date): Promise<number> {
    const qb = this.opportunityRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .where('o.deleted = :deleted', { deleted: false })
      .andWhere('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('o.updatedAt BETWEEN :start AND :end', { start, end })

    if (target.scope === TargetScope.INDIVIDUAL && target.assignedUserId) {
      qb.andWhere('o.assignedUserId = :targetUserId', { targetUserId: target.assignedUserId })
    }
    const result = await qb.getRawOne<{ total: string }>()
    return Number(result?.total) || 0
  }

  private async computeDealCount(target: SalesTarget, start: Date, end: Date): Promise<number> {
    const qb = this.opportunityRepository
      .createQueryBuilder('o')
      .select('COUNT(*)', 'total')
      .where('o.deleted = :deleted', { deleted: false })
      .andWhere('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
      .andWhere('o.updatedAt BETWEEN :start AND :end', { start, end })

    if (target.scope === TargetScope.INDIVIDUAL && target.assignedUserId) {
      qb.andWhere('o.assignedUserId = :targetUserId', { targetUserId: target.assignedUserId })
    }
    const result = await qb.getRawOne<{ total: string }>()
    return Number(result?.total) || 0
  }

  private async computeNewCustomerCount(
    target: SalesTarget,
    start: Date,
    end: Date,
  ): Promise<number> {
    const qb = this.customerRepository
      .createQueryBuilder('c')
      .select('COUNT(*)', 'total')
      .where('c.deleted = :deleted', { deleted: false })
      .andWhere('c.createdAt BETWEEN :start AND :end', { start, end })

    if (target.scope === TargetScope.INDIVIDUAL && target.assignedUserId) {
      qb.andWhere('c.assignedUserId = :targetUserId', { targetUserId: target.assignedUserId })
    }
    const result = await qb.getRawOne<{ total: string }>()
    return Number(result?.total) || 0
  }

  private async computeCallCount(target: SalesTarget, start: Date, end: Date): Promise<number> {
    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'total')
      .where('cr.deleted = :deleted', { deleted: false })
      .andWhere('cr.callAt BETWEEN :start AND :end', { start, end })

    if (target.scope === TargetScope.INDIVIDUAL && target.assignedUserId) {
      qb.andWhere('cr.userId = :targetUserId', { targetUserId: target.assignedUserId })
    }
    const result = await qb.getRawOne<{ total: string }>()
    return Number(result?.total) || 0
  }

  // ─── Snapshot Rankings (called by cron) ──────────────────────────────

  async snapshotRankings(): Promise<number> {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const quarter = Math.ceil(month / 3)
    const snapshotDate = now.toISOString().slice(0, 10)

    // Check if today's snapshot already exists — avoid duplicates on re-run
    const existing = await this.rankingRepository.findOne({
      where: { snapshotDate: new Date(snapshotDate), year, month },
    })
    if (existing) {
      return 0
    }

    const users = await this.userRepository.find({
      where: { isActive: true, deleted: false },
    })

    const metricTypes = Object.values(TargetMetricType)
    let created = 0

    for (const metricType of metricTypes) {
      // Compute per-user metrics for current month
      const userMetrics: Array<{ userId: number; userName: string; value: number }> = []

      for (const user of users) {
        const value = await this.computeUserMetric(user.id, metricType, year, month)
        userMetrics.push({ userId: user.id, userName: user.name, value })
      }

      // Sort descending to determine ranks
      userMetrics.sort((a, b) => b.value - a.value)

      for (let i = 0; i < userMetrics.length; i++) {
        const m = userMetrics[i]
        const ranking = this.rankingRepository.create({
          userId: m.userId,
          userName: m.userName,
          period: TargetPeriod.MONTH,
          metricType,
          metricValue: m.value,
          rank: i + 1,
          snapshotDate: new Date(snapshotDate),
          scope: TargetScope.COMPANY,
          year,
          quarter,
          month,
        })
        await this.rankingRepository.save(ranking)
        created++
      }
    }

    return created
  }

  private async computeUserMetric(
    userId: number,
    metricType: TargetMetricType,
    year: number,
    month: number,
  ): Promise<number> {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)

    switch (metricType) {
      case TargetMetricType.REVENUE: {
        const result = await this.opportunityRepository
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.amount), 0)', 'total')
          .where('o.deleted = :deleted', { deleted: false })
          .andWhere('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
          .andWhere('o.assignedUserId = :userId', { userId })
          .andWhere('o.updatedAt BETWEEN :start AND :end', { start, end })
          .getRawOne<{ total: string }>()
        return Number(result?.total) || 0
      }
      case TargetMetricType.DEAL_COUNT: {
        const result = await this.opportunityRepository
          .createQueryBuilder('o')
          .select('COUNT(*)', 'total')
          .where('o.deleted = :deleted', { deleted: false })
          .andWhere('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
          .andWhere('o.assignedUserId = :userId', { userId })
          .andWhere('o.updatedAt BETWEEN :start AND :end', { start, end })
          .getRawOne<{ total: string }>()
        return Number(result?.total) || 0
      }
      case TargetMetricType.NEW_CUSTOMER: {
        const result = await this.customerRepository
          .createQueryBuilder('c')
          .select('COUNT(*)', 'total')
          .where('c.deleted = :deleted', { deleted: false })
          .andWhere('c.assignedUserId = :userId', { userId })
          .andWhere('c.createdAt BETWEEN :start AND :end', { start, end })
          .getRawOne<{ total: string }>()
        return Number(result?.total) || 0
      }
      case TargetMetricType.CALL_COUNT: {
        const result = await this.callRecordRepository
          .createQueryBuilder('cr')
          .select('COUNT(*)', 'total')
          .where('cr.deleted = :deleted', { deleted: false })
          .andWhere('cr.userId = :userId', { userId })
          .andWhere('cr.callAt BETWEEN :start AND :end', { start, end })
          .getRawOne<{ total: string }>()
        return Number(result?.total) || 0
      }
      default:
        return 0
    }
  }

  // ─── Company-level summary for dashboard ─────────────────────────────

  async getCompanyOverview(year: number): Promise<
    Array<{
      metricType: TargetMetricType
      targetValue: number
      achievedValue: number
      achievementRate: number
    }>
  > {
    const cacheKey = `${CACHE_KEYS.SALES_TARGET_STATS}:overview:${year}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const targets = await this.targetRepository.find({
      where: {
        scope: TargetScope.COMPANY,
        year,
        deleted: false,
        period: TargetPeriod.YEAR,
      },
    })

    const result = targets.map((t) => ({
      metricType: t.metricType,
      targetValue: Number(t.targetValue),
      achievedValue: Number(t.achievedValue),
      achievementRate:
        Number(t.targetValue) > 0
          ? Math.round((Number(t.achievedValue) / Number(t.targetValue)) * 10000) / 100
          : 0,
    }))

    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.SALES_TARGET_STATS)
    return result
  }

  // ─── Access control ────────────────────────────────────────────────────

  private checkTargetAccess(target: SalesTarget, user?: AuthUser): void {
    if (
      user &&
      user.role === UserRole.SALES &&
      target.scope === TargetScope.INDIVIDUAL &&
      target.assignedUserId !== user.id
    ) {
      throw new ForbiddenException('您无权访问此销售目标')
    }
  }

  // ─── Cache helpers ────────────────────────────────────────────────────

  private async invalidateTargetCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.SALES_TARGET_STATS}:*`)
  }
}
