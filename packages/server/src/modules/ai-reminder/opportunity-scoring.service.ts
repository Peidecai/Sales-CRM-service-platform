import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { OpportunityScore, ScoreDimensions } from './entities/opportunity-score.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'
import { AiService } from '../ai/ai.service'
import { OpportunityStage } from '@crm/shared'
import { OpportunityScoreQueryDto } from './dto'

@Injectable()
export class OpportunityScoringService {
  private readonly logger = new Logger(OpportunityScoringService.name)

  constructor(
    @InjectRepository(OpportunityScore)
    private readonly scoreRepo: Repository<OpportunityScore>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly aiService: AiService,
    @InjectQueue('ai-scoring')
    private readonly scoringQueue: Queue,
  ) {}

  async scoreOpportunity(opportunityId: number): Promise<OpportunityScore> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId },
    })
    if (!opportunity) {
      throw new NotFoundException(`Opportunity #${opportunityId} not found`)
    }

    const customer = await this.customerRepo.findOne({
      where: { id: opportunity.customerId },
    })

    const systemPrompt = `You are a sales opportunity scoring AI. Score the opportunity on 5 dimensions (0-100 each):
- customerFit: How well the customer matches our ideal profile
- engagementLevel: How engaged the customer is
- stageProgress: How well the opportunity is progressing through stages
- sentimentTrend: Overall sentiment trend from interactions
- competitorRisk: Risk from competitors (100 = no risk, 0 = high risk)

Return ONLY valid JSON: {"customerFit":N,"engagementLevel":N,"stageProgress":N,"sentimentTrend":N,"competitorRisk":N,"overall":N,"reasoning":"..."}`

    const userMessage = `Opportunity: ${opportunity.title}
Stage: ${opportunity.stage}
Amount: ${opportunity.amount}
Probability: ${opportunity.probability}
Customer: ${customer?.name ?? 'Unknown'} (${customer?.company ?? 'N/A'})
Industry: ${customer?.industry ?? 'N/A'}
Description: ${opportunity.description ?? 'None'}`

    let dimensions: ScoreDimensions = {
      customerFit: 50,
      engagementLevel: 50,
      stageProgress: 50,
      sentimentTrend: 50,
      competitorRisk: 50,
    }
    let overallScore = 50
    let reasoning: string | null = null

    try {
      const response = await this.aiService.chat(systemPrompt, userMessage, {
        temperature: 0.3,
        maxTokens: 512,
      })
      const parsed = JSON.parse(response) as Record<string, unknown>
      dimensions = {
        customerFit: Number(parsed['customerFit']) || 50,
        engagementLevel: Number(parsed['engagementLevel']) || 50,
        stageProgress: Number(parsed['stageProgress']) || 50,
        sentimentTrend: Number(parsed['sentimentTrend']) || 50,
        competitorRisk: Number(parsed['competitorRisk']) || 50,
      }
      overallScore =
        Number(parsed['overall']) ||
        Math.round(
          (dimensions.customerFit +
            dimensions.engagementLevel +
            dimensions.stageProgress +
            dimensions.sentimentTrend +
            dimensions.competitorRisk) /
            5,
        )
      reasoning = String(parsed['reasoning'] ?? '')
    } catch (err) {
      this.logger.warn(`AI scoring failed for opportunity #${opportunityId}, using defaults`, err)
    }

    const score = this.scoreRepo.create({
      opportunityId,
      score: overallScore,
      dimensions,
      aiReasoning: reasoning,
      scoredAt: new Date(),
    })

    return this.scoreRepo.save(score)
  }

  async getScoreHistory(
    query: OpportunityScoreQueryDto,
  ): Promise<{ list: OpportunityScore[]; total: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const qb = this.scoreRepo.createQueryBuilder('s')

    if (query.opportunityId) {
      qb.andWhere('s.opportunity_id = :oppId', { oppId: query.opportunityId })
    }

    qb.orderBy('s.scoredAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async getScoreDistribution(userId?: number): Promise<Record<string, number>> {
    const qb = this.scoreRepo
      .createQueryBuilder('s')
      .innerJoin('opportunities', 'o', 'o.id = s.opportunity_id')

    if (userId) {
      qb.andWhere('o.assigned_user_id = :userId', { userId })
    }

    // Get latest score per opportunity
    qb.select([
      `SUM(CASE WHEN s.score >= 80 THEN 1 ELSE 0 END) AS high`,
      `SUM(CASE WHEN s.score >= 50 AND s.score < 80 THEN 1 ELSE 0 END) AS medium`,
      `SUM(CASE WHEN s.score < 50 THEN 1 ELSE 0 END) AS low`,
    ])

    const raw = (await qb.getRawOne()) as Record<string, string> | undefined
    return {
      high: Number(raw?.['high'] ?? 0),
      medium: Number(raw?.['medium'] ?? 0),
      low: Number(raw?.['low'] ?? 0),
    }
  }

  async enqueueScoring(opportunityId: number): Promise<void> {
    await this.scoringQueue.add('score', { opportunityId })
  }

  @Cron('0 2 * * *')
  async batchScore(): Promise<void> {
    this.logger.log('Starting daily batch opportunity scoring...')
    const activeOpps = await this.opportunityRepo.find({
      where: {
        stage: LessThan(
          OpportunityStage.CLOSED_WON as unknown as number,
        ) as unknown as OpportunityStage,
      },
      select: ['id'],
    })

    // Filter to only active stages
    const filtered = await this.opportunityRepo
      .createQueryBuilder('o')
      .where('o.stage NOT IN (:...closed)', {
        closed: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
      })
      .select(['o.id'])
      .getMany()

    for (const opp of filtered) {
      await this.scoringQueue.add('score', { opportunityId: opp.id }, { delay: 1000 })
    }
    this.logger.log(`Enqueued ${filtered.length} opportunities for scoring`)
    // suppress unused var
    void activeOpps
  }
}
