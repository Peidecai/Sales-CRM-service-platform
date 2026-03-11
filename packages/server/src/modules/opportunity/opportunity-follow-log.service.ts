import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRole } from '@crm/shared'
import { OpportunityFollowLog } from './entities/opportunity-follow-log.entity'
import { Opportunity } from './opportunity.entity'
import { CreateOpportunityFollowLogDto } from './dto/create-opportunity-follow-log.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class OpportunityFollowLogService {
  constructor(
    @InjectRepository(OpportunityFollowLog)
    private readonly followLogRepository: Repository<OpportunityFollowLog>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
  ) {}

  async findByOpportunityId(
    opportunityId: number,
    user?: AuthUser,
  ): Promise<OpportunityFollowLog[]> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId, deleted: false },
    })
    if (!opportunity) {
      return []
    }
    if (user && user.role === UserRole.SALES && opportunity.assignedUserId !== user.id) {
      return []
    }
    return this.followLogRepository.find({
      where: { opportunityId, deleted: false },
      order: { createdAt: 'DESC' },
    })
  }

  async create(
    opportunityId: number,
    dto: CreateOpportunityFollowLogDto,
    user: AuthUser,
  ): Promise<OpportunityFollowLog> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId, deleted: false },
    })
    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID ${opportunityId} not found`)
    }
    if (user.role === UserRole.SALES && opportunity.assignedUserId !== user.id) {
      throw new ForbiddenException('您无权在此商机下添加跟进记录')
    }
    const log = this.followLogRepository.create({
      opportunityId,
      userId: user.id,
      type: dto.type,
      content: dto.content,
      result: dto.result ?? null,
      nextStep: dto.nextStep ?? null,
      attachments: dto.attachments ?? null,
    })
    return this.followLogRepository.save(log)
  }
}
