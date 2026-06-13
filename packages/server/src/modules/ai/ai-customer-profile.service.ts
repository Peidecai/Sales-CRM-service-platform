import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiService } from './ai.service'
import { RedisService } from '../../common/redis'
import { CallRecord } from '../call-record/call-record.entity'
import { Customer } from '../customer/customer.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { CustomerProfile } from './entities/customer-profile.entity'
import { CallAnalysisResult } from './entities/call-analysis-result.entity'

export interface NextBestAction {
  action: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface ChurnRisk {
  customerId: number
  riskScore: number
  factors: string[]
}

export interface BestContactTime {
  customerId: number
  bestHours: { hour: number; successRate: number }[]
  bestDayOfWeek: { day: number; successRate: number }[]
}

@Injectable()
export class AiCustomerProfileService {
  private readonly logger = new Logger(AiCustomerProfileService.name)

  constructor(
    private readonly aiService: AiService,
    private readonly redisService: RedisService,
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CallAnalysisResult)
    private readonly analysisRepo: Repository<CallAnalysisResult>,
  ) {}

  /**
   * Get Next Best Action for a customer.
   */
  async getNextBestAction(customerId: number): Promise<NextBestAction[]> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } })
    if (!customer) return []

    const opportunities = await this.opportunityRepo.find({
      where: { customerId },
      order: { updatedAt: 'DESC' },
      take: 5,
    })

    const recentCalls = await this.callRecordRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 5,
    })

    const systemPrompt = `你是一个销售策略分析师。根据客户和商机信息，推荐下一步最佳行动。
返回JSON数组格式: [{"action": "具体行动", "reason": "原因", "priority": "high|medium|low"}]
只返回JSON数组。`

    const context = `客户: ${customer.name}
行业: ${customer.industry ?? '未知'}
商机数: ${opportunities.length}
最近通话数: ${recentCalls.length}
商机阶段: ${opportunities.map((o) => o.stage).join(', ') || '无'}`

    try {
      const result = await this.aiService.chat(systemPrompt, context, {
        temperature: 0.3,
        maxTokens: 1024,
      })
      return JSON.parse(result) as NextBestAction[]
    } catch {
      return [{ action: '联系客户了解最新需求', reason: '定期维护客户关系', priority: 'medium' }]
    }
  }

  /**
   * Calculate churn risk score 0-100.
   */
  async getChurnRisk(customerId: number): Promise<ChurnRisk> {
    const factors: string[] = []
    let riskScore = 0

    // Factor 1: Days since last contact
    const lastCall = await this.callRecordRepo.findOne({
      where: { customerId },
      order: { createdAt: 'DESC' },
    })

    if (!lastCall) {
      riskScore += 30
      factors.push('从未有通话记录')
    } else {
      const daysSinceLastCall = Math.floor(
        (Date.now() - lastCall.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (daysSinceLastCall > 60) {
        riskScore += 30
        factors.push(`超过${daysSinceLastCall}天未联系`)
      } else if (daysSinceLastCall > 30) {
        riskScore += 15
        factors.push(`${daysSinceLastCall}天未联系`)
      }
    }

    // Factor 2: Opportunity status
    const activeOpps = await this.opportunityRepo.count({
      where: { customerId },
    })
    if (activeOpps === 0) {
      riskScore += 25
      factors.push('无活跃商机')
    }

    // Factor 3: Call frequency trend
    const recentCallCount = await this.callRecordRepo
      .createQueryBuilder('cr')
      .where('cr.customerId = :customerId', { customerId })
      .andWhere('cr.createdAt > DATE_SUB(NOW(), INTERVAL 1 MONTH)')
      .getCount()

    const olderCallCount = await this.callRecordRepo
      .createQueryBuilder('cr')
      .where('cr.customerId = :customerId', { customerId })
      .andWhere(
        'cr.createdAt BETWEEN DATE_SUB(NOW(), INTERVAL 2 MONTH) AND DATE_SUB(NOW(), INTERVAL 1 MONTH)',
      )
      .getCount()

    if (olderCallCount > 0 && recentCallCount < olderCallCount * 0.5) {
      riskScore += 20
      factors.push('通话频率显著下降')
    }

    // Factor 4: No recent opportunities created
    const recentOppCount = await this.opportunityRepo
      .createQueryBuilder('o')
      .where('o.customerId = :customerId', { customerId })
      .andWhere('o.createdAt > DATE_SUB(NOW(), INTERVAL 3 MONTH)')
      .getCount()

    if (recentOppCount === 0 && activeOpps === 0) {
      riskScore += 15
      factors.push('近3个月无新商机')
    }

    return {
      customerId,
      riskScore: Math.min(100, riskScore),
      factors,
    }
  }

  /**
   * Analyze call history for best contact time windows.
   */
  async getBestContactTime(customerId: number): Promise<BestContactTime> {
    const cacheKey = `ai:bct:${customerId}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as BestContactTime
    }

    // Analyze call records by hour of day
    const hourStats = await this.callRecordRepo
      .createQueryBuilder('cr')
      .select('HOUR(cr.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN cr.duration > 30 THEN 1 ELSE 0 END)', 'successful')
      .where('cr.customerId = :customerId', { customerId })
      .groupBy('HOUR(cr.createdAt)')
      .getRawMany<{ hour: number; total: string; successful: string }>()

    const bestHours = hourStats
      .map((h) => ({
        hour: h.hour,
        successRate:
          parseInt(h.total, 10) > 0
            ? Math.round((parseInt(h.successful, 10) / parseInt(h.total, 10)) * 100)
            : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)

    // Analyze by day of week
    const dayStats = await this.callRecordRepo
      .createQueryBuilder('cr')
      .select('DAYOFWEEK(cr.createdAt)', 'day')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN cr.duration > 30 THEN 1 ELSE 0 END)', 'successful')
      .where('cr.customerId = :customerId', { customerId })
      .groupBy('DAYOFWEEK(cr.createdAt)')
      .getRawMany<{ day: number; total: string; successful: string }>()

    const bestDayOfWeek = dayStats
      .map((d) => ({
        day: d.day,
        successRate:
          parseInt(d.total, 10) > 0
            ? Math.round((parseInt(d.successful, 10) / parseInt(d.total, 10)) * 100)
            : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)

    const result: BestContactTime = { customerId, bestHours, bestDayOfWeek }

    // Cache for 24 hours
    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), 86400)
    } catch (error) {
      this.logger.warn(`Failed to cache best contact time: ${String(error)}`)
    }

    return result
  }

  /**
   * Get risk + intent assessment for a customer.
   * Uses existing analysis results + LLM to infer intent/risk/occupation.
   * Updates customer_profiles table with the results.
   */
  async getRiskIntent(customerId: number): Promise<{
    intentLevel: string | null
    intentTags: string[] | null
    riskLevel: string | null
    riskText: string | null
    riskAdvice: string | null
    occupationTags: string[] | null
    wechatStatus: string | null
  }> {
    // Check if we already have a profile with risk/intent data
    let profile = await this.profileRepo.findOne({ where: { customerId } })
    if (profile?.intentLevel && profile?.riskLevel) {
      // Check staleness — re-evaluate if older than 24 hours
      const ageMs = Date.now() - (profile.updatedAt?.getTime() ?? 0)
      if (ageMs < 24 * 60 * 60 * 1000) {
        return {
          intentLevel: profile.intentLevel,
          intentTags: profile.intentTags,
          riskLevel: profile.riskLevel,
          riskText: profile.riskText,
          riskAdvice: profile.riskAdvice,
          occupationTags: profile.occupationTags,
          wechatStatus: profile.wechatStatus,
        }
      }
    }

    // Gather context from recent analyses
    const analyses = await this.analysisRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 5,
    })

    const customer = await this.customerRepo.findOne({ where: { id: customerId } })
    if (!customer) {
      return {
        intentLevel: null,
        intentTags: null,
        riskLevel: null,
        riskText: null,
        riskAdvice: null,
        occupationTags: null,
        wechatStatus: null,
      }
    }

    const churnRisk = await this.getChurnRisk(customerId)

    const analysisContext = analyses
      .map(
        (a) =>
          `[${a.createdAt.toISOString().slice(0, 10)}] 分类:${a.customerClassify ?? '未知'} 摘要:${a.summary?.slice(0, 100) ?? '无'}`,
      )
      .join('\n')

    const systemPrompt = `你是客户风险和意向分析师。根据以下信息评估客户的意向和风险。
返回JSON: {"intentLevel":"高意向|中意向|低意向|无意向","intentTags":["标签1"],"riskLevel":"低风险|中风险|高风险","riskText":"风险描述","riskAdvice":"建议","occupationTags":["职业标签"],"wechatStatus":"已加微|未加微|未知"}
只返回JSON。`

    const context = `客户: ${customer.name}
行业: ${customer.industry ?? '未知'}
状态: ${customer.status}
流失风险分: ${churnRisk.riskScore}/100
风险因素: ${churnRisk.factors.join(', ') || '无'}
最近分析记录:
${analysisContext || '无'}`

    try {
      const raw = await this.aiService.chat(systemPrompt, context, {
        temperature: 0.3,
        maxTokens: 512,
      })
      const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
      const stripped = (fenceMatch ? fenceMatch[1] : raw).trim()
      const parsed = JSON.parse(stripped) as Record<string, unknown>

      const result = {
        intentLevel: (parsed.intentLevel as string) ?? null,
        intentTags: (parsed.intentTags as string[]) ?? null,
        riskLevel: (parsed.riskLevel as string) ?? null,
        riskText: (parsed.riskText as string) ?? null,
        riskAdvice: (parsed.riskAdvice as string) ?? null,
        occupationTags: (parsed.occupationTags as string[]) ?? null,
        wechatStatus: (parsed.wechatStatus as string) ?? null,
      }

      // Persist to profile
      if (!profile) {
        profile = this.profileRepo.create({ customerId })
      }
      Object.assign(profile, result)
      await this.profileRepo.save(profile)

      return result
    } catch (err) {
      this.logger.warn(`Risk-intent analysis failed for customer #${customerId}: ${String(err)}`)
      return {
        intentLevel: null,
        intentTags: null,
        riskLevel:
          churnRisk.riskScore >= 60 ? '高风险' : churnRisk.riskScore >= 30 ? '中风险' : '低风险',
        riskText: churnRisk.factors.join('; ') || null,
        riskAdvice: null,
        occupationTags: null,
        wechatStatus: null,
      }
    }
  }
}
