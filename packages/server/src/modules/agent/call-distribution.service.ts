import { Injectable } from '@nestjs/common'
import { RedisService } from '../../common/redis'
import { AgentStatusService } from './agent-status.service'

const REDIS_KEY_LAST_ASSIGNED = 'agent:last_assigned_index'

@Injectable()
export class CallDistributionService {
  constructor(
    private readonly agentStatus: AgentStatusService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 从当前 IDLE 的坐席中按策略选一个。
   * 需要传入当前 IDLE 的 agentIds（由 Controller 从 User 表查出的坐席列表再过滤得到）。
   */
  async selectAgent(
    idleAgentIds: number[],
    strategy: 'round_robin' | 'least_calls' | 'skill_based',
    _options?: { skillIds?: number[] },
  ): Promise<number | null> {
    if (idleAgentIds.length === 0) return null
    if (strategy === 'round_robin') {
      const idx = await this.redis.get(REDIS_KEY_LAST_ASSIGNED)
      const next = (parseInt(idx ?? '0', 10) + 1) % idleAgentIds.length
      await this.redis.set(REDIS_KEY_LAST_ASSIGNED, String(next))
      return idleAgentIds[next] ?? idleAgentIds[0] ?? null
    }
    if (strategy === 'least_calls') {
      return idleAgentIds[0]
    }
    return idleAgentIds[0]
  }
}
