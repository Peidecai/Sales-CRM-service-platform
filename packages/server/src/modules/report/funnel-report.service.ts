import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer/customer.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Contract } from '../contract/entities/contract.entity'
import { RedisService } from '../../common/redis/redis.service'
import { ReportFilterDto, GroupBy } from './dto/report-filter.dto'
import { UserRole, OpportunityStage, ContractStatus, CustomerStatus } from '@crm/shared'
import { createHash } from 'crypto'

interface AuthUser {
  id: number
  role: string
}

@Injectable()
export class FunnelReportService {
  private readonly logger = new Logger(FunnelReportService.name)
  private readonly CACHE_TTL = 900

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
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

  async getSalesFunnel(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:funnel:sales:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    // Leads (status = LEAD)
    const leadQb = this.customerRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status = :status', { status: CustomerStatus.LEAD })
    if (effectiveFilter.userId) {
      leadQb.andWhere('c.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }
    if (effectiveFilter.startDate) {
      leadQb.andWhere('c.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      leadQb.andWhere('c.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    // Total customers
    const custQb = this.customerRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.deletedAt IS NULL')
    if (effectiveFilter.userId) {
      custQb.andWhere('c.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }
    if (effectiveFilter.startDate) {
      custQb.andWhere('c.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      custQb.andWhere('c.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    // Opportunities
    const oppQb = this.opportunityRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'count')
      .where('o.deletedAt IS NULL')
    if (effectiveFilter.userId) {
      oppQb.andWhere('o.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }
    if (effectiveFilter.startDate) {
      oppQb.andWhere('o.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      oppQb.andWhere('o.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    // Contracts
    const conQb = this.contractRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
    if (effectiveFilter.userId) {
      conQb.andWhere('c.owner_id = :userId', { userId: effectiveFilter.userId })
    }
    if (effectiveFilter.startDate) {
      conQb.andWhere('c.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      conQb.andWhere('c.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    const [leads, customers, opportunities, contracts] = await Promise.all([
      leadQb.getRawOne(),
      custQb.getRawOne(),
      oppQb.getRawOne(),
      conQb.getRawOne(),
    ])

    const leadCount = Number(leads?.count ?? 0)
    const customerCount = Number(customers?.count ?? 0)
    const oppCount = Number(opportunities?.count ?? 0)
    const contractCount = Number(contracts?.count ?? 0)

    const result = {
      stages: [
        { name: '线索', count: leadCount },
        { name: '客户', count: customerCount },
        { name: '商机', count: oppCount },
        { name: '合同', count: contractCount },
      ],
      conversionRates: {
        leadToCustomer: leadCount > 0 ? Math.round((customerCount / leadCount) * 10000) / 100 : 0,
        customerToOpportunity:
          customerCount > 0 ? Math.round((oppCount / customerCount) * 10000) / 100 : 0,
        opportunityToContract:
          oppCount > 0 ? Math.round((contractCount / oppCount) * 10000) / 100 : 0,
      },
    }

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getStageConversion(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:funnel:stage:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const qb = this.opportunityRepo
      .createQueryBuilder('o')
      .select('o.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('o.deletedAt IS NULL')
      .groupBy('o.stage')

    if (effectiveFilter.userId) {
      qb.andWhere('o.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }
    if (effectiveFilter.startDate) {
      qb.andWhere('o.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      qb.andWhere('o.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    const stageOrder = [
      OpportunityStage.LEAD,
      OpportunityStage.QUALIFIED,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
      OpportunityStage.CLOSED_WON,
    ]

    const rawData = await qb.getRawMany()
    const stageMap = new Map<string, number>()
    for (const row of rawData) {
      stageMap.set(row.stage as string, Number(row.count))
    }

    const stages = stageOrder.map((stage) => ({
      stage,
      count: stageMap.get(stage) ?? 0,
    }))

    // Calculate inter-stage conversion
    const conversions = stages.slice(0, -1).map((s, i) => ({
      from: s.stage,
      to: stages[i + 1].stage,
      rate: s.count > 0 ? Math.round((stages[i + 1].count / s.count) * 10000) / 100 : 0,
    }))

    const result = { stages, conversions }
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }

  async getVisitStatistics(filter: ReportFilterDto, user: AuthUser): Promise<unknown> {
    const effectiveFilter = this.applyDataPermission(filter, user)
    const cacheKey = `report:funnel:visit:${this.hashFilter(effectiveFilter)}`
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const groupExpr =
      effectiveFilter.groupBy === GroupBy.MONTH
        ? "DATE_FORMAT(o.createdAt, '%Y-%m')"
        : effectiveFilter.groupBy === GroupBy.WEEK
          ? 'YEARWEEK(o.createdAt, 1)'
          : 'DATE(o.createdAt)'

    const qb = this.opportunityRepo
      .createQueryBuilder('o')
      .select(groupExpr, 'period')
      .addSelect('COUNT(*)', 'count')
      .where('o.deletedAt IS NULL')
      .groupBy(groupExpr)
      .orderBy(groupExpr, 'ASC')

    if (effectiveFilter.userId) {
      qb.andWhere('o.assigned_user_id = :userId', { userId: effectiveFilter.userId })
    }
    if (effectiveFilter.startDate) {
      qb.andWhere('o.createdAt >= :startDate', { startDate: effectiveFilter.startDate })
    }
    if (effectiveFilter.endDate) {
      qb.andWhere('o.createdAt <= :endDate', { endDate: effectiveFilter.endDate })
    }

    const result = await qb.getRawMany()
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL)
    return result
  }
}
