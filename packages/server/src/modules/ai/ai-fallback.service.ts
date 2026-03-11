import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ClaudeService } from './claude.service'
import { AiService } from './ai.service'
import { CostTrackerService } from './cost-tracker.service'
import { PromptManagerService } from './prompt-manager.service'
import { AiUsageLog } from './entities/ai-usage-log.entity'
import { RedisService } from '../../common/redis/redis.service'
import * as crypto from 'crypto'

export interface FallbackResult {
  text: string
  source: 'claude' | 'dashscope' | 'cache' | 'rule' | 'default'
  usage?: { inputTokens: number; outputTokens: number }
  model?: string
}

interface CircuitState {
  failures: number
  lastFailure: number
  openUntil: number
}

@Injectable()
export class AiFallbackService {
  private readonly logger = new Logger(AiFallbackService.name)
  private readonly circuit: CircuitState = { failures: 0, lastFailure: 0, openUntil: 0 }
  private readonly FAILURE_THRESHOLD = 5
  private readonly WINDOW_MS = 30000 // 30s sliding window
  private readonly OPEN_DURATION_MS = 60000 // 60s circuit open

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly aiService: AiService,
    private readonly costTracker: CostTrackerService,
    private readonly promptManager: PromptManagerService,
    private readonly redisService: RedisService,
    @InjectRepository(AiUsageLog)
    private readonly usageLogRepo: Repository<AiUsageLog>,
  ) {}

  async invokeWithFallback(
    feature: string,
    userContent: string,
    options?: { tenantId?: number; userId?: number; temperature?: number; maxTokens?: number },
  ): Promise<FallbackResult> {
    const traceId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const startTime = Date.now()

    // Check budget first
    const estimatedCost = 0.01 // Rough estimate per call
    const budgetCheck = await this.costTracker.checkAndIncr(
      feature,
      estimatedCost,
      options?.tenantId,
    )
    if (!budgetCheck.allowed) {
      this.logger.warn(`Budget exceeded for feature ${feature}, using fallback`)
      return this.fallbackChain(feature, userContent, traceId, startTime, options)
    }

    // Get prompt from PromptManager
    const prompt = await this.promptManager.getPrompt(feature, userContent, {
      tenantId: options?.tenantId,
    })

    // Level 1: Try Claude (if circuit is closed)
    if (!this.isCircuitOpen() && this.claudeService.isAvailable()) {
      try {
        const result = await this.claudeService.generate(prompt.messages, {
          system: prompt.system,
          temperature: options?.temperature ?? 0.3,
          maxTokens: options?.maxTokens ?? 2048,
        })

        this.resetCircuit()
        await this.cacheResult(feature, userContent, result.text)
        await this.logUsage(
          traceId,
          feature,
          result.model,
          result.usage,
          startTime,
          'success',
          options,
        )

        return { text: result.text, source: 'claude', usage: result.usage, model: result.model }
      } catch (error) {
        this.recordFailure()
        this.logger.warn(`Claude failed for ${feature}: ${String(error)}`)
      }
    }

    // Level 1b: Try DashScope fallback
    try {
      const result = await this.aiService.chat(prompt.system, userContent, {
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 2048,
      })

      if (result) {
        await this.cacheResult(feature, userContent, result)
        await this.logUsage(traceId, feature, 'dashscope', undefined, startTime, 'success', options)
        return { text: result, source: 'dashscope' }
      }
    } catch (error) {
      this.logger.warn(`DashScope failed for ${feature}: ${String(error)}`)
    }

    return this.fallbackChain(feature, userContent, traceId, startTime, options)
  }

  private async fallbackChain(
    feature: string,
    userContent: string,
    traceId: string,
    startTime: number,
    options?: { tenantId?: number; userId?: number },
  ): Promise<FallbackResult> {
    // Level 2: Stale cache (within 24h)
    const cached = await this.getCachedResult(feature, userContent)
    if (cached) {
      await this.logUsage(traceId, feature, 'cache', undefined, startTime, 'cache_hit', options)
      return { text: cached, source: 'cache' }
    }

    // Level 3: Rule engine (simple keyword-based fallback)
    const ruleResult = this.applyRuleEngine(feature, userContent)
    if (ruleResult) {
      await this.logUsage(traceId, feature, 'rule', undefined, startTime, 'rule_fallback', options)
      return { text: ruleResult, source: 'rule' }
    }

    // Level 4: Default value
    await this.logUsage(
      traceId,
      feature,
      'default',
      undefined,
      startTime,
      'default_fallback',
      options,
    )
    return { text: this.getDefaultResult(feature), source: 'default' }
  }

  private async cacheResult(feature: string, input: string, output: string): Promise<void> {
    const key = `ai:cache:${feature}:${this.hashInput(input)}`
    await this.redisService.set(key, output, 86400) // 24h TTL
  }

  private async getCachedResult(feature: string, input: string): Promise<string | null> {
    const key = `ai:cache:${feature}:${this.hashInput(input)}`
    return this.redisService.get(key)
  }

  private hashInput(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex').slice(0, 16)
  }

  private applyRuleEngine(feature: string, _userContent: string): string | null {
    // Simple rule-based fallbacks for known features
    const rules: Record<string, string> = {
      customer_profile: JSON.stringify({
        discType: 'S',
        discScores: { D: 25, I: 25, S: 25, C: 25 },
        communicationStyle: '暂无分析数据，请稍后重试',
        painPoints: [],
        healthScore: 50,
      }),
      intent_prediction: JSON.stringify({
        purchaseProbability: 50,
        predictedCloseDate: null,
        positiveSignals: ['需要更多数据分析'],
        negativeSignals: ['暂无足够数据'],
      }),
    }
    return rules[feature] ?? null
  }

  private getDefaultResult(feature: string): string {
    const defaults: Record<string, string> = {
      call_summary: '暂无法生成通话摘要，请稍后重试。',
      customer_profile: JSON.stringify({
        discType: null,
        communicationStyle: '暂无分析',
        painPoints: [],
        healthScore: null,
      }),
      intent_prediction: JSON.stringify({
        purchaseProbability: null,
        predictedCloseDate: null,
        positiveSignals: [],
        negativeSignals: [],
      }),
      anomaly_detect: JSON.stringify({ alerts: [] }),
      report_generate: JSON.stringify({ summary: '报告暂时无法生成，请稍后重试。' }),
      sales_forecast: JSON.stringify({ forecastAmount: 0, confidenceLow: 0, confidenceHigh: 0 }),
      competitor_analysis: JSON.stringify({ competitors: [] }),
      script_recommend: JSON.stringify({
        scripts: [{ scene: '通用', content: '请根据客户需求进行沟通', tip: '倾听客户需求' }],
      }),
    }
    return defaults[feature] ?? '暂无分析结果'
  }

  // Circuit breaker logic
  private isCircuitOpen(): boolean {
    if (Date.now() < this.circuit.openUntil) {
      return true
    }
    // Reset if window has passed
    if (Date.now() - this.circuit.lastFailure > this.WINDOW_MS) {
      this.circuit.failures = 0
    }
    return false
  }

  private recordFailure(): void {
    const now = Date.now()
    if (now - this.circuit.lastFailure > this.WINDOW_MS) {
      this.circuit.failures = 1
    } else {
      this.circuit.failures++
    }
    this.circuit.lastFailure = now

    if (this.circuit.failures >= this.FAILURE_THRESHOLD) {
      this.circuit.openUntil = now + this.OPEN_DURATION_MS
      this.logger.warn(`Circuit breaker OPEN — skipping Claude for ${this.OPEN_DURATION_MS}ms`)
    }
  }

  private resetCircuit(): void {
    this.circuit.failures = 0
    this.circuit.openUntil = 0
  }

  private async logUsage(
    traceId: string,
    feature: string,
    model: string,
    usage: { inputTokens: number; outputTokens: number } | undefined,
    startTime: number,
    status: string,
    options?: { tenantId?: number; userId?: number },
  ): Promise<void> {
    try {
      const log = this.usageLogRepo.create({
        traceId,
        feature,
        model,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        cost: this.estimateCost(model, usage),
        latencyMs: Date.now() - startTime,
        status,
        tenantId: options?.tenantId ?? null,
        userId: options?.userId ?? null,
      })
      await this.usageLogRepo.save(log)
    } catch (error) {
      // Fire-and-forget, don't block main flow
      this.logger.error(`Failed to log AI usage: ${String(error)}`)
    }
  }

  private estimateCost(
    model: string,
    usage?: { inputTokens: number; outputTokens: number },
  ): number {
    if (!usage) return 0
    // Claude Sonnet pricing estimate: $3/1M input, $15/1M output
    if (model.includes('claude')) {
      return (usage.inputTokens * 3 + usage.outputTokens * 15) / 1_000_000
    }
    // DashScope/Qwen pricing estimate: much cheaper
    return (usage.inputTokens * 0.5 + usage.outputTokens * 1) / 1_000_000
  }
}
