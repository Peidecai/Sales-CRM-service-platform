import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Contract } from '../contract/entities/contract.entity'
import { Payment } from '../payment/entities/payment.entity'
import { User } from '../user/user.entity'
import { SalesTarget } from '../sales-target/sales-target.entity'
import { RedisService } from '../../common/redis/redis.service'
import { ReportFilterDto, GroupBy } from './dto/report-filter.dto'
import { UserRole, ContractStatus, PaymentStatus } from '@crm/shared'
import { createHash } from 'crypto'

interface AuthUser {
  id: number
  role: string
}

@Injectable()
export class PerformanceReportService {
  private readonly logger = new Logger(PerformanceReportService.name)
  private readonly CACHE_TTL = 900

  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SalesTarget)
    private readonly salesTargetRepo: Repository<SalesTarget>,
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

  async getSummary(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:performance:summary:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const qb = this.contractRepo
      .createQueryBuilder('c')
      .select('c.owner_id', 'userId')
      .addSelect('u.name', 'userName')
      .addSelect('COUNT(c.id)', 'contractCount')
      .addSelect('SUM(c.total_amount)', 'contractAmount')
      .leftJoin(User, 'u', 'u.id = c.owner_id')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
      .groupBy('c.owner_id')
      .addGroupBy('u.name')

    if (effectiveFilter.startDate) {
      qb.andWhere('c.sign_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      qb.andWhere('c.sign_date <= :endDate', { endDate: effectiveFilter.endDate })
    }
    if (effectiveFilter.userId) {
      qb.andWhere('c.owner_id = :userId', { userId: effectiveFilter.userId })
    }

    const rows = await qb.getRawMany()

    // Enrich with payment amounts and targets
    const result = await Promise.all(
      rows.map(async (row: Record<string, unknown>) => {
        const paymentQb = this.paymentRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.actual_amount), 0)', 'paymentAmount')
          .where('p.owner_id = :ownerId', { ownerId: row['userId'] })
          .andWhere('p.status = :status', { status: PaymentStatus.CONFIRMED })
          .andWhere('p.deletedAt IS NULL')

        if (effectiveFilter.startDate) {
          paymentQb.andWhere('p.actual_date >= :startDate', {
            startDate: effectiveFilter.startDate,
          })
        }
        if (effectiveFilter.endDate) {
          paymentQb.andWhere('p.actual_date <= :endDate', { endDate: effectiveFilter.endDate })
        }

        const payment = await paymentQb.getRawOne()

        const targetQb = this.salesTargetRepo
          .createQueryBuilder('st')
          .select('COALESCE(SUM(st.target_value), 0)', 'targetAmount')
          .where('st.assigned_user_id = :uid', { uid: row['userId'] })
          .andWhere('st.deletedAt IS NULL')

        const target = await targetQb.getRawOne()

        const targetAmount = Number(target?.targetAmount ?? 0)
        const contractAmount = Number(row['contractAmount'] ?? 0)

        return {
          ...row,
          paymentAmount: Number(payment?.paymentAmount ?? 0),
          targetAmount,
          completionRate:
            targetAmount > 0 ? Math.round((contractAmount / targetAmount) * 10000) / 100 : 0,
        }
      }),
    )

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getSigningStats(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:performance:signing:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const groupExpr =
      effectiveFilter.groupBy === GroupBy.MONTH
        ? "DATE_FORMAT(c.sign_date, '%Y-%m')"
        : effectiveFilter.groupBy === GroupBy.WEEK
          ? 'YEARWEEK(c.sign_date, 1)'
          : 'DATE(c.sign_date)'

    // Signing trends
    const trendQb = this.contractRepo
      .createQueryBuilder('c')
      .select(groupExpr, 'period')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(c.total_amount)', 'amount')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
      .groupBy(groupExpr)
      .orderBy(groupExpr, 'ASC')

    if (effectiveFilter.startDate) {
      trendQb.andWhere('c.sign_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      trendQb.andWhere('c.sign_date <= :endDate', { endDate: effectiveFilter.endDate })
    }
    if (effectiveFilter.userId) {
      trendQb.andWhere('c.owner_id = :userId', { userId: effectiveFilter.userId })
    }

    // Top signers
    const topQb = this.contractRepo
      .createQueryBuilder('c')
      .select('c.owner_id', 'userId')
      .addSelect('u.name', 'userName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(c.total_amount)', 'amount')
      .leftJoin(User, 'u', 'u.id = c.owner_id')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
      .groupBy('c.owner_id')
      .addGroupBy('u.name')
      .orderBy('SUM(c.total_amount)', 'DESC')
      .limit(effectiveFilter.topN ?? 10)

    if (effectiveFilter.startDate) {
      topQb.andWhere('c.sign_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      topQb.andWhere('c.sign_date <= :endDate', { endDate: effectiveFilter.endDate })
    }

    // Conversion rate
    const oppCountQb = this.opportunityRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'total')
      .where('o.deletedAt IS NULL')

    if (effectiveFilter.startDate) {
      oppCountQb.andWhere('o.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      oppCountQb.andWhere('o.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }
    if (effectiveFilter.userId) {
      oppCountQb.andWhere('o.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }

    const contractCountQb = this.contractRepo
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.opportunity_id)', 'converted')
      .where('c.deletedAt IS NULL')
      .andWhere('c.opportunity_id IS NOT NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })

    if (effectiveFilter.startDate) {
      contractCountQb.andWhere('c.createdAt >= :startDate', {
        startDate: effectiveFilter.startDate,
      })
    }
    if (effectiveFilter.endDate) {
      contractCountQb.andWhere('c.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    const [trends, topSigners, oppCount, convertedCount] = await Promise.all([
      trendQb.getRawMany(),
      topQb.getRawMany(),
      oppCountQb.getRawOne(),
      contractCountQb.getRawOne(),
    ])

    const totalOpp = Number(oppCount?.total ?? 0)
    const converted = Number(convertedCount?.converted ?? 0)

    const result = {
      trends,
      topSigners,
      conversionRate: totalOpp > 0 ? Math.round((converted / totalOpp) * 10000) / 100 : 0,
      totalOpportunities: totalOpp,
      convertedCount: converted,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getCollectionStats(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:performance:collection:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const groupExpr =
      effectiveFilter.groupBy === GroupBy.MONTH
        ? "DATE_FORMAT(p.actual_date, '%Y-%m')"
        : effectiveFilter.groupBy === GroupBy.WEEK
          ? 'YEARWEEK(p.actual_date, 1)'
          : 'DATE(p.actual_date)'

    // Payment trends
    const trendQb = this.paymentRepo
      .createQueryBuilder('p')
      .select(groupExpr, 'period')
      .addSelect('SUM(p.actual_amount)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .where('p.deletedAt IS NULL')
      .andWhere('p.status = :status', { status: PaymentStatus.CONFIRMED })
      .andWhere('p.actual_date IS NOT NULL')
      .groupBy(groupExpr)
      .orderBy(groupExpr, 'ASC')

    if (effectiveFilter.startDate) {
      trendQb.andWhere('p.actual_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      trendQb.andWhere('p.actual_date <= :endDate', { endDate: effectiveFilter.endDate })
    }
    if (effectiveFilter.userId) {
      trendQb.andWhere('p.owner_id = :userId', { userId: effectiveFilter.userId })
    }

    // Overdue stats
    const overdueQb = this.paymentRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'totalPlanned')
      .addSelect('SUM(CASE WHEN p.is_overdue = 1 THEN 1 ELSE 0 END)', 'overdueCount')
      .addSelect('SUM(CASE WHEN p.status = :confirmed THEN 1 ELSE 0 END)', 'collectedCount')
      .where('p.deletedAt IS NULL')
      .setParameter('confirmed', PaymentStatus.CONFIRMED)

    if (effectiveFilter.startDate) {
      overdueQb.andWhere('p.planned_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      overdueQb.andWhere('p.planned_date <= :endDate', { endDate: effectiveFilter.endDate })
    }
    if (effectiveFilter.userId) {
      overdueQb.andWhere('p.owner_id = :userId', { userId: effectiveFilter.userId })
    }

    // Per-user collection
    const perUserQb = this.paymentRepo
      .createQueryBuilder('p')
      .select('p.owner_id', 'userId')
      .addSelect('u.name', 'userName')
      .addSelect('SUM(p.actual_amount)', 'collectedAmount')
      .addSelect('COUNT(*)', 'count')
      .leftJoin(User, 'u', 'u.id = p.owner_id')
      .where('p.deletedAt IS NULL')
      .andWhere('p.status = :status', { status: PaymentStatus.CONFIRMED })
      .groupBy('p.owner_id')
      .addGroupBy('u.name')
      .orderBy('SUM(p.actual_amount)', 'DESC')

    if (effectiveFilter.startDate) {
      perUserQb.andWhere('p.actual_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      perUserQb.andWhere('p.actual_date <= :endDate', { endDate: effectiveFilter.endDate })
    }

    const [trends, overdueStats, perUser] = await Promise.all([
      trendQb.getRawMany(),
      overdueQb.getRawOne(),
      perUserQb.getRawMany(),
    ])

    const totalPlanned = Number(overdueStats?.totalPlanned ?? 0)
    const overdueCount = Number(overdueStats?.overdueCount ?? 0)
    const collectedCount = Number(overdueStats?.collectedCount ?? 0)

    const result = {
      trends,
      collectionRate:
        totalPlanned > 0 ? Math.round((collectedCount / totalPlanned) * 10000) / 100 : 0,
      overdueRate: totalPlanned > 0 ? Math.round((overdueCount / totalPlanned) * 10000) / 100 : 0,
      perUser,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getOverview(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:performance:overview:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const contractQb = this.contractRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'totalContracts')
      .addSelect('COALESCE(SUM(c.total_amount), 0)', 'totalRevenue')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })

    if (effectiveFilter.startDate) {
      contractQb.andWhere('c.sign_date >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      contractQb.andWhere('c.sign_date <= :endDate', { endDate: effectiveFilter.endDate })
    }
    if (effectiveFilter.userId) {
      contractQb.andWhere('c.owner_id = :userId', { userId: effectiveFilter.userId })
    }

    const stats = await contractQb.getRawOne()

    const totalContracts = Number(stats?.totalContracts ?? 0)
    const totalRevenue = Number(stats?.totalRevenue ?? 0)

    const result = {
      totalRevenue,
      totalContracts,
      avgDealSize: totalContracts > 0 ? Math.round(totalRevenue / totalContracts) : 0,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getTargetCompletion(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:performance:target:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const qb = this.salesTargetRepo
      .createQueryBuilder('st')
      .select('st.id', 'targetId')
      .addSelect('st.name', 'name')
      .addSelect('st.target_value', 'targetValue')
      .addSelect('st.achieved_value', 'achievedValue')
      .addSelect('st.assigned_user_id', 'userId')
      .addSelect('u.name', 'userName')
      .addSelect(
        'ROUND(st.achieved_value * 100.0 / GREATEST(st.target_value, 1), 2)',
        'completionRate',
      )
      .leftJoin(User, 'u', 'u.id = st.assigned_user_id')
      .where('st.deletedAt IS NULL')
      .orderBy('completionRate', 'DESC')

    if (effectiveFilter.userId) {
      qb.andWhere('st.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }

    const result = await qb.getRawMany()
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }
}
