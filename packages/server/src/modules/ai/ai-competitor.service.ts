import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { CompetitorReport } from './entities/competitor-report.entity'

@Injectable()
export class AiCompetitorService {
  constructor(
    @InjectRepository(CompetitorReport)
    private readonly competitorRepo: Repository<CompetitorReport>,
  ) {}

  async getCompetitorReports(
    customerId?: string,
    opportunityId?: string,
    page = 1,
    pageSize = 20,
    user?: AuthUser,
  ) {
    const qb = this.competitorRepo.createQueryBuilder('cr')

    if (customerId)
      qb.andWhere('cr.customerId = :customerId', { customerId: parseInt(customerId, 10) })
    if (opportunityId)
      qb.andWhere('cr.opportunityId = :opportunityId', {
        opportunityId: parseInt(opportunityId, 10),
      })

    if (user && user.role === UserRole.SALES) {
      qb.andWhere(
        'cr.customerId IN (SELECT id FROM customers WHERE assigned_user_id = :uid AND deleted_at IS NULL)',
        { uid: user.id },
      )
    }

    qb.orderBy('cr.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async getCompetitorSummary(user?: AuthUser) {
    const qb = this.competitorRepo
      .createQueryBuilder('cr')
      .select('cr.competitor_name', 'competitorName')
      .addSelect('COUNT(*)', 'mentionCount')
      .addSelect("SUM(CASE WHEN cr.win_lose = 'win' THEN 1 ELSE 0 END)", 'winCount')
      .addSelect("SUM(CASE WHEN cr.win_lose = 'lose' THEN 1 ELSE 0 END)", 'loseCount')

    if (user && user.role === UserRole.SALES) {
      qb.andWhere(
        'cr.customerId IN (SELECT id FROM customers WHERE assigned_user_id = :uid AND deleted_at IS NULL)',
        { uid: user.id },
      )
    }

    qb.groupBy('cr.competitor_name').orderBy('mentionCount', 'DESC')

    return qb.getRawMany()
  }
}
