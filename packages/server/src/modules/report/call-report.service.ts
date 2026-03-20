import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { RedisService } from '../../common/redis/redis.service'
import { ReportFilterDto, GroupBy } from './dto/report-filter.dto'
import { UserRole } from '@crm/shared'
import { createHash } from 'crypto'

interface AuthUser {
  id: number
  role: string
}

@Injectable()
export class CallReportService {
  private readonly logger = new Logger(CallReportService.name)
  private readonly CACHE_TTL = 900 // 15min

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    private readonly redis: RedisService,
  ) {}

  private hashFilter(filter: ReportFilterDto): string {
    return createHash('md5').update(JSON.stringify(filter)).digest('hex').slice(0, 12)
  }

  private applyDataPermission(filter: ReportFilterDto, user: AuthUser): ReportFilterDto {
    if (user.role === UserRole.SALES) {
      return { ...filter, userId: user.id }
    }
    return filter
  }

  private getGroupByExpression(groupBy: GroupBy = GroupBy.DAY): string {
    switch (groupBy) {
      case GroupBy.WEEK:
        return 'YEARWEEK(cr.call_at, 1)'
      case GroupBy.MONTH:
        return "DATE_FORMAT(cr.call_at, '%Y-%m')"
      case GroupBy.DAY:
      default:
        return 'DATE(cr.call_at)'
    }
  }

  async getStatistics(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:call:statistics:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const groupExpr = this.getGroupByExpression(effectiveFilter.groupBy)

    const qb = this.callRecordRepo
      .createQueryBuilder('cr')
      .select(groupExpr, 'period')
      .addSelect('COUNT(*)', 'totalCalls')
      .addSelect('SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END)', 'connectedCalls')
      .addSelect('AVG(CASE WHEN cr.duration > 0 THEN cr.duration ELSE NULL END)', 'avgDuration')
      .addSelect(
        'ROUND(SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)',
        'connectRate',
      )
      .where('cr.deletedAt IS NULL')
      .groupBy(groupExpr)
      .orderBy(groupExpr, 'ASC')

    this.applyFilters(qb, effectiveFilter)

    const result = await qb.getRawMany()
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getDailyAnalysis(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:call:daily:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)
    const lastWeekSameDay = new Date(today)
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7)
    const lastWeekStr = lastWeekSameDay.toISOString().slice(0, 10)

    const getStats = async (dateStr: string) => {
      const qb = this.callRecordRepo
        .createQueryBuilder('cr')
        .select('COUNT(*)', 'totalCalls')
        .addSelect('SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END)', 'connectedCalls')
        .addSelect('AVG(CASE WHEN cr.duration > 0 THEN cr.duration ELSE NULL END)', 'avgDuration')
        .addSelect(
          'ROUND(SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END) * 100.0 / GREATEST(COUNT(*), 1), 2)',
          'connectRate',
        )
        .where('cr.deletedAt IS NULL')
        .andWhere('DATE(cr.call_at) = :date', { date: dateStr })

      if (effectiveFilter.userId) {
        qb.andWhere('cr.user_id = :userId', { userId: effectiveFilter.userId })
      }

      return qb.getRawOne()
    }

    const [todayStats, yesterdayStats, lastWeekStats] = await Promise.all([
      getStats(todayStr),
      getStats(yesterdayStr),
      getStats(lastWeekStr),
    ])

    const result = { today: todayStats, yesterday: yesterdayStats, lastWeekSameDay: lastWeekStats }
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getPersonalAnalysis(
    targetUserId: number,
    filter: ReportFilterDto,
    user: AuthUser,
  ): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    // SALES can only view own data
    const uid = user.role === UserRole.SALES ? user.id : targetUserId
    const cacheKey = `report:call:personal:${uid}:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const qb = this.callRecordRepo
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'callCount')
      .addSelect(
        'ROUND(SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END) * 100.0 / GREATEST(COUNT(*), 1), 2)',
        'connectRate',
      )
      .addSelect('AVG(CASE WHEN cr.duration > 0 THEN cr.duration ELSE NULL END)', 'avgDuration')
      .addSelect('SUM(cr.duration)', 'totalDuration')
      .where('cr.deletedAt IS NULL')
      .andWhere('cr.user_id = :userId', { userId: uid })

    if (effectiveFilter.startDate) {
      qb.andWhere('cr.call_at >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      qb.andWhere('cr.call_at <= :endDate', { endDate: effectiveFilter.endDate })
    }

    const result = await qb.getRawOne()
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getDetailAnalysis(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:call:detail:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    // Hourly distribution
    const hourlyQb = this.callRecordRepo
      .createQueryBuilder('cr')
      .select('HOUR(cr.call_at)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('cr.deletedAt IS NULL')
      .groupBy('HOUR(cr.call_at)')
      .orderBy('HOUR(cr.call_at)', 'ASC')

    this.applyFilters(hourlyQb, effectiveFilter)

    // Duration distribution
    const durationQb = this.callRecordRepo
      .createQueryBuilder('cr')
      .select(
        `CASE
          WHEN cr.duration = 0 THEN '未接通'
          WHEN cr.duration < 60 THEN '1分钟以内'
          WHEN cr.duration < 180 THEN '1-3分钟'
          WHEN cr.duration < 300 THEN '3-5分钟'
          WHEN cr.duration < 600 THEN '5-10分钟'
          ELSE '10分钟以上'
        END`,
        'durationRange',
      )
      .addSelect('COUNT(*)', 'count')
      .where('cr.deletedAt IS NULL')
      .groupBy('durationRange')

    this.applyFilters(durationQb, effectiveFilter)

    const [hourly, duration] = await Promise.all([hourlyQb.getRawMany(), durationQb.getRawMany()])

    const result = { hourlyDistribution: hourly, durationDistribution: duration }
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  private applyFilters(
    qb: ReturnType<Repository<CallRecord>['createQueryBuilder']>,
    filter: ReportFilterDto,
  ): void {
    if (filter.startDate) {
      qb.andWhere('cr.call_at >= :startDate', { startDate: filter.startDate })
    }
    if (filter.endDate) {
      qb.andWhere('cr.call_at <= :endDate', { endDate: filter.endDate })
    }
    if (filter.userId) {
      qb.andWhere('cr.user_id = :userId', { userId: filter.userId })
    }
  }
}
