import { Injectable } from '@nestjs/common'
import { RedisService } from '../../common/redis'

const POOL_CONFIG_KEY = 'config:customer-pool'

export interface PoolConfig {
  daily_claim_limit: number
  max_holding: number
  cooldown_days: number
  protect_days_new: number
  protect_days_following: number
  protect_days_intention: number
  protect_days_opportunity: number
  recycle_days_lead: number
  recycle_days_potential: number
  recycle_days_following: number
  recycle_days_intention: number
  auto_recycle_enabled: boolean
}

const DEFAULT_CONFIG: PoolConfig = {
  daily_claim_limit: 5,
  max_holding: 50,
  cooldown_days: 3,
  protect_days_new: 15,
  protect_days_following: 30,
  protect_days_intention: 45,
  protect_days_opportunity: 60,
  recycle_days_lead: 7,
  recycle_days_potential: 15,
  recycle_days_following: 30,
  recycle_days_intention: 45,
  auto_recycle_enabled: true,
}

@Injectable()
export class CustomerPoolConfigService {
  constructor(private readonly redisService: RedisService) {}

  async getConfig(): Promise<PoolConfig> {
    const raw = await this.redisService.hGetAll(POOL_CONFIG_KEY)
    const config = { ...DEFAULT_CONFIG }

    if (raw && Object.keys(raw).length > 0) {
      for (const [key, value] of Object.entries(raw)) {
        if (key in config) {
          if (key === 'auto_recycle_enabled') {
            ;(config as Record<string, unknown>)[key] = value === 'true'
          } else {
            ;(config as Record<string, unknown>)[key] = Number(value)
          }
        }
      }
    }

    return config
  }

  async updateConfig(partial: Partial<PoolConfig>): Promise<PoolConfig> {
    for (const [key, value] of Object.entries(partial)) {
      await this.redisService.hSet(POOL_CONFIG_KEY, key, String(value))
    }
    return this.getConfig()
  }

  async getConfigValue(key: keyof PoolConfig): Promise<string | null> {
    return this.redisService.hGet(POOL_CONFIG_KEY, key)
  }
}
