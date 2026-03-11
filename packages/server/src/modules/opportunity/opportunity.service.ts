import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
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

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(OpportunityStageLog)
    private readonly stageLogRepository: Repository<OpportunityStageLog>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateOpportunityDto): Promise<Opportunity> {
    const stage = dto.stage ?? OpportunityStage.LEAD
    const probability = dto.probability ?? STAGE_PROBABILITY[stage]

    const opportunity = this.opportunityRepository.create({
      ...dto,
      stage,
      probability,
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
      .where('opportunity.deleted = :deleted', { deleted: false })

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
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      const opportunity = JSON.parse(cached) as Opportunity
      this.checkOwnership(opportunity, user)
      return opportunity
    }

    const opportunity = await this.opportunityRepository.findOne({
      where: { id, deleted: false },
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
    const fromProbability = opportunity.probability
    const toProbability = STAGE_PROBABILITY[dto.stage]

    opportunity.stage = dto.stage
    opportunity.probability = toProbability
    const saved = await this.opportunityRepository.save(opportunity)

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
    await this.stageLogRepository.save(stageLog)

    await this.invalidateStatsCache()
    await this.invalidateDetailCache(id)
    return {
      opportunity: saved,
      previousStage,
      currentStage: saved.stage,
    }
  }

  async remove(id: number): Promise<void> {
    const opportunity = await this.findOne(id)
    opportunity.deleted = true
    await this.opportunityRepository.save(opportunity)
    await this.invalidateStatsCache()
    await this.invalidateDetailCache(id)
  }

  async getStats(user: AuthUser): Promise<OpportunityStageStats[]> {
    const cacheKey = this.getStatsCacheKey(user)
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as OpportunityStageStats[]
    }

    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'totalAmount')
      .where('opportunity.deleted = :deleted', { deleted: false })

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
   * Export all non-deleted opportunities as CSV string.
   */
  async exportCsv(user: AuthUser): Promise<string> {
    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.customer', 'customer')
      .where('opportunity.deleted = :deleted', { deleted: false })

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

  /** Invalidate opportunity stats cache */
  private async invalidateStatsCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.OPPORTUNITY_STATS}:*`)
  }

  /** Invalidate a single opportunity detail cache */
  private async invalidateDetailCache(id: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.OPPORTUNITY_DETAIL}:${id}`)
  }

  private getStatsCacheKey(user: AuthUser): string {
    const scope = user.role === UserRole.SALES ? `sales:${user.id}` : user.role
    return `${CACHE_KEYS.OPPORTUNITY_STATS}:${scope}`
  }
}
