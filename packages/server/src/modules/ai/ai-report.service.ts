import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Repository } from 'typeorm'
import { Queue } from 'bull'
import { UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { AiReport } from './entities/ai-report.entity'

@Injectable()
export class AiReportService {
  constructor(
    @InjectRepository(AiReport)
    private readonly reportRepo: Repository<AiReport>,
    @InjectQueue('report-generate')
    private readonly reportQueue: Queue,
  ) {}

  async getReports(
    reportType?: string,
    periodValue?: string,
    page = 1,
    pageSize = 20,
    user?: AuthUser,
  ) {
    const qb = this.reportRepo.createQueryBuilder('report')

    if (reportType) qb.andWhere('report.reportType = :reportType', { reportType })
    if (periodValue) qb.andWhere('report.periodValue = :periodValue', { periodValue })

    if (user && user.role === UserRole.SALES) {
      qb.andWhere('report.createdBy = :uid', { uid: user.id })
    }

    qb.orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async generateReport(reportType: string, periodValue: string, userId: number) {
    await this.reportQueue.add({ reportType, periodValue, createdBy: userId })
    return { status: 'queued' }
  }
}
