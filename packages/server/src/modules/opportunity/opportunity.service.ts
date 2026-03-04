import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OpportunityStage } from '@crm/shared'
import { Opportunity } from './opportunity.entity'
import { CreateOpportunityDto } from './dto/create-opportunity.dto'
import { UpdateOpportunityDto } from './dto/update-opportunity.dto'
import { QueryOpportunityDto } from './dto/query-opportunity.dto'
import { UpdateStageDto } from './dto/update-stage.dto'

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

@Injectable()
export class OpportunityService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
  ) {}

  async create(dto: CreateOpportunityDto): Promise<Opportunity> {
    const stage = dto.stage ?? OpportunityStage.LEAD
    const probability = dto.probability ?? STAGE_PROBABILITY[stage]

    const opportunity = this.opportunityRepository.create({
      ...dto,
      stage,
      probability,
    })

    return this.opportunityRepository.save(opportunity)
  }

  async findAll(query: QueryOpportunityDto): Promise<PageResult<Opportunity>> {
    const { page = 1, pageSize = 20, keyword, stage, customerId, assignedUserId } = query

    const qb = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.deleted = :deleted', { deleted: false })

    if (keyword) {
      qb.andWhere('opportunity.title LIKE :kw', { kw: `%${keyword}%` })
    }

    if (stage) {
      qb.andWhere('opportunity.stage = :stage', { stage })
    }

    if (customerId) {
      qb.andWhere('opportunity.customerId = :customerId', { customerId })
    }

    if (assignedUserId) {
      qb.andWhere('opportunity.assignedUserId = :assignedUserId', { assignedUserId })
    }

    qb.orderBy('opportunity.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()

    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<Opportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id, deleted: false },
    })

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${id} not found`)
    }

    return opportunity
  }

  async update(id: number, dto: UpdateOpportunityDto): Promise<Opportunity> {
    const opportunity = await this.findOne(id)
    Object.assign(opportunity, dto)
    return this.opportunityRepository.save(opportunity)
  }

  async updateStage(id: number, dto: UpdateStageDto): Promise<Opportunity> {
    const opportunity = await this.findOne(id)
    opportunity.stage = dto.stage
    opportunity.probability = STAGE_PROBABILITY[dto.stage]
    return this.opportunityRepository.save(opportunity)
  }

  async remove(id: number): Promise<void> {
    const opportunity = await this.findOne(id)
    opportunity.deleted = true
    await this.opportunityRepository.save(opportunity)
  }

  async getStats(): Promise<OpportunityStageStats[]> {
    const rows = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'totalAmount')
      .where('opportunity.deleted = :deleted', { deleted: false })
      .groupBy('opportunity.stage')
      .getRawMany<{ stage: OpportunityStage; count: string; totalAmount: string }>()

    return rows.map((row) => ({
      stage: row.stage,
      count: Number(row.count),
      totalAmount: Number(row.totalAmount) || 0,
    }))
  }
}
