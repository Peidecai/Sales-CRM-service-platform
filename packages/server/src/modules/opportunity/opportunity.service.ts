import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm'
import { OpportunityStage, UserRole } from '@crm/shared'
import { Opportunity } from './opportunity.entity'
import { OpportunityStageLog } from './entities/opportunity-stage-log.entity'
import { CreateOpportunityDto } from './dto/create-opportunity.dto'
import { UpdateOpportunityDto } from './dto/update-opportunity.dto'
import { QueryOpportunityDto } from './dto/query-opportunity.dto'
import { UpdateStageDto } from './dto/update-stage.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

/** Default win probability for each stage */
const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  [OpportunityStage.LEAD]: 10,
  [OpportunityStage.QUALIFIED]: 25,
  [OpportunityStage.PROPOSAL]: 50,
  [OpportunityStage.NEGOTIATION]: 75,
  [OpportunityStage.CLOSED_WON]: 100,
  [OpportunityStage.CLOSED_LOST]: 0,
}

/** Allowed stage transitions — terminal stages (CLOSED_WON/CLOSED_LOST) cannot transition */
const ALLOWED_STAGE_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  [OpportunityStage.LEAD]: [OpportunityStage.QUALIFIED, OpportunityStage.CLOSED_LOST],
  [OpportunityStage.QUALIFIED]: [
    OpportunityStage.LEAD,
    OpportunityStage.PROPOSAL,
    OpportunityStage.CLOSED_LOST,
  ],
  [OpportunityStage.PROPOSAL]: [
    OpportunityStage.QUALIFIED,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.CLOSED_LOST,
  ],
  [OpportunityStage.NEGOTIATION]: [
    OpportunityStage.PROPOSAL,
    OpportunityStage.CLOSED_WON,
    OpportunityStage.CLOSED_LOST,
  ],
  [OpportunityStage.CLOSED_WON]: [],
  [OpportunityStage.CLOSED_LOST]: [],
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface OpportunityStageStats {
  stage: OpportunityStage
  count: number
  totalAmount: number
}

export interface OpportunityStageUpdateResult {
  opportunity: Opportunity
  previousStage: OpportunityStage
  currentStage: OpportunityStage
}

export interface FunnelStageItem {
  stage: OpportunityStage
  count: number
  amount: number
  conversionRate: number
}

export interface SalesFunnelResult {
  stages: FunnelStageItem[]
  totalAmount: number
  winRate: number
}

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(OpportunityStageLog)
    private readonly stageLogRepository: Repository<OpportunityStageLog>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateOpportunityDto): Promise<Opportunity> {
    const stage = dto.stage ?? OpportunityStage.LEAD
    const probability = dto.probability ?? STAGE_PROBABILITY[stage]

    const opportunity = this.opportunityRepository.create({
      ...dto,
      stage,
      probability,
      weightedAmount: this.calculateWeightedAmount(dto.amount ?? 0, probability),
    })

    const saved = await this.opportunityRepository.save(opportunity)
    await this.invalidateStatsCache()
    return saved
  }

  async findAll(query: QueryOpportunityDto, user: AuthUser): Promise<PageResult<Opportunity>> {
    const { page = 1, pageSize = 20, keyword, stage, customerId, assignedUserId } = query

    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.customer', 'customer')

    this.applyDataPermission(qb, user)

    if (keyword) {
      qb.andWhere('opportunity.title LIKE :kw', { kw: `%${keyword}%` })
    }

    if (stage) {
      qb.andWhere('opportunity.stage = :stage', { stage })
    }

    if (customerId) {
      qb.andWhere('opportunity.customerId = :customerId', { customerId })
    }

    if (assignedUserId && user.role !== UserRole.SALES) {
      qb.andWhere('opportunity.assignedUserId = :assignedUserId', { assignedUserId })
    }

    qb.orderBy('opportunity.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()

    return { list, total, page, pageSize }
  }

  async findOne(id: number, user?: AuthUser): Promise<Opportunity> {
    const cacheKey = `${CACHE_KEYS.OPPORTUNITY_DETAIL}:${id}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      const opportunity = JSON.parse(cached) as Opportunity
      this.checkOwnership(opportunity, user)
      return opportunity
    }

    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
      relations: ['customer'],
    })

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`)
    }

    this.checkOwnership(opportunity, user)

    await this.redisService.set(cacheKey, JSON.stringify(opportunity), CACHE_TTL.OPPORTUNITY_DETAIL)
    return opportunity
  }

  async update(id: number, dto: UpdateOpportunityDto, user?: AuthUser): Promise<Opportunity> {
    const opportunity = await this.findOne(id, user)
    Object.assign(opportunity, dto)

    if (dto.amount !== undefined || dto.probability !== undefined) {
      opportunity.weightedAmount = this.calculateWeightedAmount(
        opportunity.amount,
        opportunity.probability,
      )
    }

    const saved = await this.opportunityRepository.save(opportunity)
    await this.invalidateStatsCache()
    await this.invalidateDetailCache(id)
    return saved
  }

  async updateStage(
    id: number,
    dto: UpdateStageDto,
    user?: AuthUser,
  ): Promise<OpportunityStageUpdateResult> {
    const opportunity = await this.findOne(id, user)
    const previousStage = opportunity.stage

    // Validate stage transition
    const allowedTargets = ALLOWED_STAGE_TRANSITIONS[previousStage]
    if (!allowedTargets.includes(dto.stage)) {
      throw new BadRequestException(`不允许从 ${previousStage} 阶段转换到 ${dto.stage} 阶段`)
    }

    const fromProbability = opportunity.probability
    const toProbability = STAGE_PROBABILITY[dto.stage]

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      opportunity.stage = dto.stage
      opportunity.probability = toProbability
      opportunity.weightedAmount = this.calculateWeightedAmount(opportunity.amount, toProbability)

      // Persist close fields for terminal stages
      if (dto.stage === OpportunityStage.CLOSED_WON) {
        opportunity.actualCloseDate = new Date()
        opportunity.closeReason = dto.closeReason ?? null
        opportunity.closeRemark = dto.closeRemark ?? null
      } else if (dto.stage === OpportunityStage.CLOSED_LOST) {
        opportunity.closeReason = dto.closeReason ?? null
        opportunity.closeRemark = dto.closeRemark ?? null
      }

      const saved = await queryRunner.manager.save(opportunity)

      const lastLog = await this.stageLogRepository.findOne({
        where: { opportunityId: id },
        order: { createdAt: 'DESC' },
      })
      const now = new Date()
      const previousStageEnteredAt = lastLog ? lastLog.createdAt : opportunity.createdAt
      const stayDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(previousStageEnteredAt).getTime()) / 86400000),
      )

      const stageLog = this.stageLogRepository.create({
        opportunityId: id,
        fromStage: previousStage,
        toStage: dto.stage,
        fromProbability,
        toProbability,
        stayDays,
        operatorId: user?.id ?? saved.assignedUserId,
        remark: null,
      })
      await queryRunner.manager.save(stageLog)

      await queryRunner.commitTransaction()

      await this.invalidateStatsCache()
      await this.invalidateDetailCache(id)
      return {
        opportunity: saved,
        previousStage,
        currentStage: saved.stage,
      }
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async remove(id: number): Promise<void> {
    const opportunity = await this.findOne(id)
    await this.opportunityRepository.softRemove(opportunity)
    await this.invalidateStatsCache()
    await this.invalidateDetailCache(id)
  }

  async getStats(user: AuthUser): Promise<OpportunityStageStats[]> {
    const cacheKey = this.getStatsCacheKey(user)
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as OpportunityStageStats[]
    }

    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'totalAmount')

    if (user.role === UserRole.SALES) {
      qb.andWhere('opportunity.assignedUserId = :currentUserId', { currentUserId: user.id })
    }

    qb.groupBy('opportunity.stage')

    const rows = await qb.getRawMany<{
      stage: OpportunityStage
      count: string
      totalAmount: string
    }>()

    const result = rows.map((row) => ({
      stage: row.stage,
      count: Number(row.count),
      totalAmount: Number(row.totalAmount) || 0,
    }))

    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.OPPORTUNITY_STATS)
    return result
  }

  /**
   * Get sales funnel data: counts, amounts, and conversion rates per stage.
   */
  async getSalesFunnel(user: AuthUser): Promise<SalesFunnelResult> {
    const cacheKey = this.getFunnelCacheKey(user)
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as SalesFunnelResult
    }

    const STAGE_ORDER: OpportunityStage[] = [
      OpportunityStage.LEAD,
      OpportunityStage.QUALIFIED,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
      OpportunityStage.CLOSED_WON,
      OpportunityStage.CLOSED_LOST,
    ]

    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'amount')

    if (user.role === UserRole.SALES) {
      qb.andWhere('opportunity.assignedUserId = :currentUserId', { currentUserId: user.id })
    }

    qb.groupBy('opportunity.stage')

    const rows = await qb.getRawMany<{
      stage: OpportunityStage
      count: string
      amount: string
    }>()

    // Build a map for quick lookup
    const stageMap = new Map<OpportunityStage, { count: number; amount: number }>()
    for (const row of rows) {
      stageMap.set(row.stage, {
        count: Number(row.count),
        amount: Number(row.amount) || 0,
      })
    }

    // Build ordered stage list (including stages with 0 count)
    const stageItems: FunnelStageItem[] = STAGE_ORDER.map((stage) => {
      const data = stageMap.get(stage) ?? { count: 0, amount: 0 }
      return { stage, count: data.count, amount: data.amount, conversionRate: 0 }
    })

    // Calculate conversion rates: next active stage count / current stage count
    // Only LEAD→QUALIFIED→PROPOSAL→NEGOTIATION→CLOSED_WON funnel stages (not CLOSED_LOST)
    const activeFunnelStages = [
      OpportunityStage.LEAD,
      OpportunityStage.QUALIFIED,
      OpportunityStage.PROPOSAL,
      OpportunityStage.NEGOTIATION,
      OpportunityStage.CLOSED_WON,
    ]

    for (let i = 0; i < stageItems.length; i++) {
      const current = stageItems[i]
      const nextStage = activeFunnelStages[activeFunnelStages.indexOf(current.stage) + 1]
      if (nextStage) {
        const nextItem = stageItems.find((s) => s.stage === nextStage)
        current.conversionRate = current.count > 0 && nextItem ? nextItem.count / current.count : 0
      }
    }

    // Total amount across all non-closed_lost stages
    const totalAmount = stageItems
      .filter((s) => s.stage !== OpportunityStage.CLOSED_LOST)
      .reduce((sum, s) => sum + s.amount, 0)

    // Win rate: closed_won / (closed_won + closed_lost)
    const wonCount = stageMap.get(OpportunityStage.CLOSED_WON)?.count ?? 0
    const lostCount = stageMap.get(OpportunityStage.CLOSED_LOST)?.count ?? 0
    const closedTotal = wonCount + lostCount
    const winRate = closedTotal > 0 ? wonCount / closedTotal : 0

    const result = { stages: stageItems, totalAmount, winRate }
    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.OPPORTUNITY_FUNNEL)
    return result
  }

  /**
   * Export all non-deleted opportunities as CSV string.
   */
  async exportCsv(user: AuthUser): Promise<string> {
    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.customer', 'customer')

    this.applyDataPermission(qb, user)
    qb.orderBy('opportunity.updatedAt', 'DESC')

    const opportunities = await qb.getMany()

    const stageLabels: Record<string, string> = {
      [OpportunityStage.LEAD]: '线索',
      [OpportunityStage.QUALIFIED]: '意向客户',
      [OpportunityStage.PROPOSAL]: '方案报价',
      [OpportunityStage.NEGOTIATION]: '商务谈判',
      [OpportunityStage.CLOSED_WON]: '成交',
      [OpportunityStage.CLOSED_LOST]: '丢单',
    }

    const header = '标题,关联客户,阶段,金额,成交概率,预计成交日期,描述'
    const rows = opportunities.map((o) => {
      const customerName = o.customer ? o.customer.name : ''
      const stageLabel = stageLabels[o.stage] ?? o.stage
      return [
        this.escapeCsvField(o.title),
        this.escapeCsvField(customerName),
        this.escapeCsvField(stageLabel),
        String(o.amount ?? 0),
        String(o.probability ?? 0),
        this.escapeCsvField(o.expectedCloseDate ? String(o.expectedCloseDate) : ''),
        this.escapeCsvField(o.description ?? ''),
      ].join(',')
    })

    // Add BOM for Excel UTF-8 compatibility
    return '\uFEFF' + [header, ...rows].join('\n')
  }

  /** Calculate weighted amount = amount * probability / 100, rounded to 2 decimals */
  private calculateWeightedAmount(amount: number, probability: number): number {
    return Math.round(amount * probability) / 100
  }

  /** Apply data permission: SALES users can only see their own records */
  private applyDataPermission(qb: SelectQueryBuilder<Opportunity>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('opportunity.assignedUserId = :currentUserId', { currentUserId: user.id })
    }
  }

  /** Check ownership for single record access */
  private checkOwnership(opportunity: Opportunity, user?: AuthUser): void {
    if (user && user.role === UserRole.SALES && opportunity.assignedUserId !== user.id) {
      throw new ForbiddenException('您无权访问此商机')
    }
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /** Invalidate opportunity stats and funnel caches */
  private async invalidateStatsCache(): Promise<void> {
    await Promise.all([
      this.redisService.delByPattern(`${CACHE_KEYS.OPPORTUNITY_STATS}:*`),
      this.redisService.delByPattern(`${CACHE_KEYS.OPPORTUNITY_FUNNEL}:*`),
    ])
  }

  /** Invalidate a single opportunity detail cache */
  private async invalidateDetailCache(id: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.OPPORTUNITY_DETAIL}:${id}`)
  }

  private getStatsCacheKey(user: AuthUser): string {
    const scope = user.role === UserRole.SALES ? `sales:${user.id}` : user.role
    return `${CACHE_KEYS.OPPORTUNITY_STATS}:${scope}`
  }

  private getFunnelCacheKey(user: AuthUser): string {
    const scope = user.role === UserRole.SALES ? `sales:${user.id}` : user.role
    return `${CACHE_KEYS.OPPORTUNITY_FUNNEL}:${scope}`
  }
}
