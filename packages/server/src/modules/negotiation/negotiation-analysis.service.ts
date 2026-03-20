import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { NegotiationAnalysis } from './entities/negotiation-analysis.entity'
import { QueryNegotiationAnalysisDto } from './dto/query-negotiation-analysis.dto'
import { NegotiationDashboardQueryDto } from './dto/negotiation-dashboard-query.dto'
import { CallRecordService } from '../call-record/call-record.service'
import { AiService } from '../ai/ai.service'
import { NegotiationStatus } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class NegotiationAnalysisService {
  private readonly logger = new Logger(NegotiationAnalysisService.name)

  constructor(
    @InjectRepository(NegotiationAnalysis)
    private readonly repo: Repository<NegotiationAnalysis>,
    @InjectQueue('negotiation-analysis')
    private readonly queue: Queue,
    private readonly callRecordService: CallRecordService,
    private readonly aiService: AiService,
  ) {}

  async triggerAnalysis(callRecordId: number, userId: number): Promise<NegotiationAnalysis> {
    const callRecord = await this.callRecordService.findOne(callRecordId, {
      id: userId,
      username: '',
      role: 'admin',
    } as AuthUser)
    if (!callRecord) {
      throw new NotFoundException(`Call record #${callRecordId} not found`)
    }

    const existing = await this.repo.findOne({ where: { callRecordId } })
    if (existing) {
      // Re-trigger if failed
      if (existing.status === NegotiationStatus.FAILED) {
        existing.status = NegotiationStatus.PENDING
        await this.repo.save(existing)
        await this.queue.add('analyze', { analysisId: existing.id })
        return existing
      }
      return existing
    }

    const analysis = this.repo.create({
      callRecordId,
      customerId: callRecord.customerId ?? null,
      userId,
      status: NegotiationStatus.PENDING,
    })
    const saved = await this.repo.save(analysis)
    await this.queue.add('analyze', { analysisId: saved.id })
    return saved
  }

  async findAll(query: QueryNegotiationAnalysisDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      outcome,
      userId,
      customerId,
      startDate,
      endDate,
    } = query
    const qb = this.repo.createQueryBuilder('na')

    if (status) {
      qb.andWhere('na.status = :status', { status })
    }
    if (outcome) {
      qb.andWhere('na.outcome = :outcome', { outcome })
    }
    if (userId) {
      qb.andWhere('na.user_id = :userId', { userId })
    }
    if (customerId) {
      qb.andWhere('na.customer_id = :customerId', { customerId })
    }
    if (startDate) {
      qb.andWhere('na.created_at >= :startDate', { startDate })
    }
    if (endDate) {
      qb.andWhere('na.created_at <= :endDate', { endDate })
    }

    qb.orderBy('na.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<NegotiationAnalysis> {
    const analysis = await this.repo.findOne({ where: { id } })
    if (!analysis) {
      throw new NotFoundException(`Negotiation analysis #${id} not found`)
    }
    return analysis
  }

  async remove(id: number): Promise<void> {
    const analysis = await this.findOne(id)
    await this.repo.softRemove(analysis)
  }

  async generateReNegotiationAdvice(id: number): Promise<NegotiationAnalysis> {
    const analysis = await this.findOne(id)
    if (analysis.status !== NegotiationStatus.COMPLETED) {
      throw new NotFoundException('Analysis must be completed before generating advice')
    }

    const prompt = `Based on this negotiation analysis, provide re-negotiation advice:
Score: ${analysis.overallScore}
Strategy: ${analysis.strategy}
Outcome: ${analysis.outcome}
Summary: ${analysis.summary}
Strengths: ${JSON.stringify(analysis.strengths)}
Weaknesses: ${JSON.stringify(analysis.weaknesses)}
Concessions: ${JSON.stringify(analysis.concessions)}

Provide actionable advice for re-negotiation in Chinese. Focus on:
1. How to leverage strengths
2. How to address weaknesses
3. Better concession strategies
4. Recommended approach for next meeting`

    const advice = await this.aiService.chat(
      '你是一位资深谈判顾问，请根据谈判分析结果提供再谈判建议。',
      prompt,
      { temperature: 0.7, maxTokens: 1024 },
    )

    analysis.reNegotiationAdvice = advice
    return this.repo.save(analysis)
  }

  async getDashboard(filter: NegotiationDashboardQueryDto) {
    const qb = this.repo
      .createQueryBuilder('na')
      .where('na.status = :status', { status: NegotiationStatus.COMPLETED })

    if (filter.startDate) {
      qb.andWhere('na.created_at >= :startDate', { startDate: filter.startDate })
    }
    if (filter.endDate) {
      qb.andWhere('na.created_at <= :endDate', { endDate: filter.endDate })
    }
    if (filter.userId) {
      qb.andWhere('na.user_id = :userId', { userId: filter.userId })
    }

    const stats = await qb
      .select('AVG(na.overall_score)', 'avgScore')
      .addSelect('COUNT(*)', 'totalAnalyses')
      .addSelect('SUM(CASE WHEN na.outcome = :won THEN 1 ELSE 0 END)', 'wonCount')
      .addSelect('AVG(JSON_LENGTH(na.concessions))', 'avgConcessions')
      .setParameter('won', 'won')
      .getRawOne()

    const total = Number(stats?.totalAnalyses ?? 0)
    const wonCount = Number(stats?.wonCount ?? 0)

    // Strategy distribution
    const strategyDist = await this.repo
      .createQueryBuilder('na')
      .select('na.strategy', 'strategy')
      .addSelect('COUNT(*)', 'count')
      .where('na.status = :status', { status: NegotiationStatus.COMPLETED })
      .andWhere('na.strategy IS NOT NULL')
      .groupBy('na.strategy')
      .getRawMany()

    // Outcome distribution
    const outcomeDist = await this.repo
      .createQueryBuilder('na')
      .select('na.outcome', 'outcome')
      .addSelect('COUNT(*)', 'count')
      .where('na.status = :status', { status: NegotiationStatus.COMPLETED })
      .andWhere('na.outcome IS NOT NULL')
      .groupBy('na.outcome')
      .getRawMany()

    return {
      avgScore: Number(stats?.avgScore ?? 0),
      totalAnalyses: total,
      winRate: total > 0 ? wonCount / total : 0,
      avgConcessions: Number(stats?.avgConcessions ?? 0),
      strategyDistribution: strategyDist,
      outcomeDistribution: outcomeDist,
    }
  }

  async getPatterns(filter: NegotiationDashboardQueryDto) {
    const baseQb = () => {
      const qb = this.repo
        .createQueryBuilder('na')
        .where('na.status = :status', { status: NegotiationStatus.COMPLETED })
      if (filter.startDate)
        qb.andWhere('na.created_at >= :startDate', { startDate: filter.startDate })
      if (filter.endDate) qb.andWhere('na.created_at <= :endDate', { endDate: filter.endDate })
      if (filter.userId) qb.andWhere('na.user_id = :userId', { userId: filter.userId })
      return qb
    }

    const wonStats = await baseQb()
      .andWhere('na.outcome = :outcome', { outcome: 'won' })
      .select('AVG(na.overall_score)', 'avgScore')
      .addSelect('COUNT(*)', 'count')
      .getRawOne()

    const lostStats = await baseQb()
      .andWhere('na.outcome = :outcome', { outcome: 'lost' })
      .select('AVG(na.overall_score)', 'avgScore')
      .addSelect('COUNT(*)', 'count')
      .getRawOne()

    const wonStrategies = await baseQb()
      .andWhere('na.outcome = :outcome', { outcome: 'won' })
      .andWhere('na.strategy IS NOT NULL')
      .select('na.strategy', 'strategy')
      .addSelect('COUNT(*)', 'count')
      .groupBy('na.strategy')
      .orderBy('count', 'DESC')
      .getRawMany()

    const lostStrategies = await baseQb()
      .andWhere('na.outcome = :outcome', { outcome: 'lost' })
      .andWhere('na.strategy IS NOT NULL')
      .select('na.strategy', 'strategy')
      .addSelect('COUNT(*)', 'count')
      .groupBy('na.strategy')
      .orderBy('count', 'DESC')
      .getRawMany()

    return {
      won: {
        avgScore: Number(wonStats?.avgScore ?? 0),
        count: Number(wonStats?.count ?? 0),
        topStrategies: wonStrategies,
      },
      lost: {
        avgScore: Number(lostStats?.avgScore ?? 0),
        count: Number(lostStats?.count ?? 0),
        topStrategies: lostStrategies,
      },
    }
  }

  async exportCsv(filter: NegotiationDashboardQueryDto): Promise<string> {
    const qb = this.repo
      .createQueryBuilder('na')
      .where('na.status = :status', { status: NegotiationStatus.COMPLETED })

    if (filter.startDate)
      qb.andWhere('na.created_at >= :startDate', { startDate: filter.startDate })
    if (filter.endDate) qb.andWhere('na.created_at <= :endDate', { endDate: filter.endDate })
    if (filter.userId) qb.andWhere('na.user_id = :userId', { userId: filter.userId })

    const records = await qb.orderBy('na.created_at', 'DESC').getMany()

    const header = 'ID,通话记录ID,客户ID,销售ID,状态,评分,策略,结果,摘要,创建时间\n'
    const rows = records.map((r) =>
      [
        r.id,
        r.callRecordId,
        r.customerId ?? '',
        r.userId,
        r.status,
        r.overallScore ?? '',
        r.strategy ?? '',
        r.outcome ?? '',
        `"${(r.summary ?? '').replace(/"/g, '""')}"`,
        r.createdAt.toISOString(),
      ].join(','),
    )

    return header + rows.join('\n')
  }
}
