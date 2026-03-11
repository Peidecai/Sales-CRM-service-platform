import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../common/redis/redis.service'

export interface BudgetCheckResult {
  allowed: boolean
  remaining?: number
}

const DEFAULT_TENANT_MONTHLY_BUDGET = 500 // $500
const DEFAULT_FEATURE_BUDGETS: Record<string, number> = {
  call_summary: 100,
  customer_profile: 80,
  intent_prediction: 50,
  report_generate: 100,
  sales_forecast: 80,
  anomaly_detect: 30,
  competitor_analysis: 30,
  script_recommend: 30,
}

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name)

  constructor(private readonly redisService: RedisService) {}

  private getMonthKey(tenantId: number): string {
    const now = new Date()
    const yyyyMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    return `ai:cost:tenant:${tenantId}:${yyyyMM}`
  }

  private getFeatureKey(tenantId: number, feature: string): string {
    const now = new Date()
    const yyyyMM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    return `ai:cost:tenant:${tenantId}:${yyyyMM}:${feature}`
  }

  async checkAndIncr(
    feature: string,
    estimatedCost: number,
    tenantId = 1,
  ): Promise<BudgetCheckResult> {
    const client = this.redisService.getClient()

    // Check tenant monthly budget
    const monthKey = this.getMonthKey(tenantId)
    const currentTotalStr = await client.incrbyfloat(monthKey, estimatedCost)
    const currentTotal = parseFloat(currentTotalStr)
    // Ensure key expires at end of month (31 days max)
    await client.expire(monthKey, 31 * 24 * 3600)

    const monthlyBudget = await this.getBudgetLimit(tenantId)
    if (currentTotal > monthlyBudget) {
      // Rollback
      await client.incrbyfloat(monthKey, -estimatedCost)
      this.logger.warn(
        `Tenant ${tenantId} exceeded monthly budget: $${currentTotal.toFixed(4)} / $${monthlyBudget}`,
      )
      return { allowed: false, remaining: monthlyBudget - (currentTotal - estimatedCost) }
    }

    // Check feature sub-budget
    const featureKey = this.getFeatureKey(tenantId, feature)
    const currentFeatureStr = await client.incrbyfloat(featureKey, estimatedCost)
    const currentFeature = parseFloat(currentFeatureStr)
    await client.expire(featureKey, 31 * 24 * 3600)

    const featureBudget = DEFAULT_FEATURE_BUDGETS[feature] ?? 50
    if (currentFeature > featureBudget) {
      // Rollback both
      await client.incrbyfloat(featureKey, -estimatedCost)
      await client.incrbyfloat(monthKey, -estimatedCost)
      this.logger.warn(
        `Feature ${feature} exceeded budget: $${currentFeature.toFixed(4)} / $${featureBudget}`,
      )
      return { allowed: false, remaining: featureBudget - (currentFeature - estimatedCost) }
    }

    const remaining = monthlyBudget - currentTotal
    return { allowed: true, remaining }
  }

  private async getBudgetLimit(tenantId: number): Promise<number> {
    // Try reading custom budget from Redis Hash
    const custom = await this.redisService.hGet(`ai:budget:config`, String(tenantId))
    if (custom) {
      const parsed = parseFloat(custom)
      if (!isNaN(parsed)) return parsed
    }
    return DEFAULT_TENANT_MONTHLY_BUDGET
  }

  async getCurrentUsage(
    tenantId = 1,
  ): Promise<{ total: number; byFeature: Record<string, number> }> {
    const client = this.redisService.getClient()
    const monthKey = this.getMonthKey(tenantId)
    const totalStr = await client.get(monthKey)
    const total = totalStr ? parseFloat(totalStr) : 0

    const byFeature: Record<string, number> = {}
    for (const feature of Object.keys(DEFAULT_FEATURE_BUDGETS)) {
      const featureKey = this.getFeatureKey(tenantId, feature)
      const val = await client.get(featureKey)
      byFeature[feature] = val ? parseFloat(val) : 0
    }

    return { total, byFeature }
  }
}
