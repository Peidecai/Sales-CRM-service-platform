import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiUsageLog } from './ai-usage-log.entity'
import { UsageQueryDto } from './dto/playground.dto'

export interface LogUsageData {
  module: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost?: number
  latencyMs: number
  isSuccess: boolean
  errorMessage?: string | null
  triggeredById?: number | null
}

export interface UsageStatItem {
  date: string
  module: string
  totalTokens: string
  requestCount: string
  estimatedCost: string
}

@Injectable()
export class AiUsageService {
  constructor(
    @InjectRepository(AiUsageLog)
    private readonly usageRepo: Repository<AiUsageLog>,
  ) {}

  async logUsage(data: LogUsageData): Promise<AiUsageLog> {
    const log = this.usageRepo.create({
      ...data,
      errorMessage: data.errorMessage ?? null,
      triggeredById: data.triggeredById ?? null,
    })
    return this.usageRepo.save(log)
  }

  async getStatistics(query: UsageQueryDto): Promise<UsageStatItem[]> {
    const qb = this.usageRepo.createQueryBuilder('log')

    let dateFormat: string
    switch (query.groupBy) {
      case 'week':
        dateFormat = '%Y-%u'
        break
      case 'month':
        dateFormat = '%Y-%m'
        break
      default:
        dateFormat = '%Y-%m-%d'
    }

    qb.select(`DATE_FORMAT(log.created_at, '${dateFormat}')`, 'date')
      .addSelect('log.module', 'module')
      .addSelect('SUM(log.totalTokens)', 'totalTokens')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('SUM(log.estimatedCost)', 'estimatedCost')
      .groupBy('date')
      .addGroupBy('log.module')
      .orderBy('date', 'ASC')

    if (query.module) {
      qb.andWhere('log.module = :module', { module: query.module })
    }
    if (query.startDate) {
      qb.andWhere('log.created_at >= :startDate', { startDate: query.startDate })
    }
    if (query.endDate) {
      qb.andWhere('log.created_at <= :endDate', { endDate: query.endDate })
    }

    return qb.getRawMany()
  }

  async getCostEstimate(
    query: UsageQueryDto,
  ): Promise<{ module: string; totalCost: string; totalTokens: string; requestCount: string }[]> {
    const qb = this.usageRepo
      .createQueryBuilder('log')
      .select('log.module', 'module')
      .addSelect('SUM(log.estimatedCost)', 'totalCost')
      .addSelect('SUM(log.totalTokens)', 'totalTokens')
      .addSelect('COUNT(*)', 'requestCount')
      .groupBy('log.module')

    if (query.module) {
      qb.andWhere('log.module = :module', { module: query.module })
    }
    if (query.startDate) {
      qb.andWhere('log.created_at >= :startDate', { startDate: query.startDate })
    }
    if (query.endDate) {
      qb.andWhere('log.created_at <= :endDate', { endDate: query.endDate })
    }

    return qb.getRawMany()
  }
}
