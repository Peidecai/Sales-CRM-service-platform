import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../../common/redis'
import { AgentStatusLog } from './entities/agent-status-log.entity'

export enum AgentStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  ON_CALL = 'ON_CALL',
  WRAP_UP = 'WRAP_UP',
  OFFLINE = 'OFFLINE',
}

const REDIS_KEY_STATUS = (agentId: number) => `agent:status:${agentId}`
const REDIS_KEY_WRAP_UP_AT = (agentId: number) => `agent:wrap_up_at:${agentId}`

const ALLOWED_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  [AgentStatus.OFFLINE]: [AgentStatus.IDLE],
  [AgentStatus.IDLE]: [AgentStatus.BUSY, AgentStatus.OFFLINE],
  [AgentStatus.BUSY]: [AgentStatus.ON_CALL],
  [AgentStatus.ON_CALL]: [AgentStatus.WRAP_UP],
  [AgentStatus.WRAP_UP]: [AgentStatus.IDLE],
}

@Injectable()
export class AgentStatusService {
  constructor(
    @InjectRepository(AgentStatusLog)
    private readonly statusLogRepository: Repository<AgentStatusLog>,
    private readonly redis: RedisService,
  ) {}

  async getStatus(agentId: number): Promise<AgentStatus> {
    const s = await this.redis.get(REDIS_KEY_STATUS(agentId))
    if (s && Object.values(AgentStatus).includes(s as AgentStatus)) {
      return s as AgentStatus
    }
    return AgentStatus.OFFLINE
  }

  async transition(agentId: number, toStatus: AgentStatus, reason?: string): Promise<void> {
    const fromStatus = await this.getStatus(agentId)
    const allowed = ALLOWED_TRANSITIONS[fromStatus]
    if (!allowed?.includes(toStatus)) {
      throw new BadRequestException(`Invalid transition from ${fromStatus} to ${toStatus}`)
    }
    await this.redis.set(REDIS_KEY_STATUS(agentId), toStatus)
    if (toStatus === AgentStatus.WRAP_UP) {
      await this.redis.set(REDIS_KEY_WRAP_UP_AT(agentId), String(Date.now()), 300)
    } else {
      await this.redis.del(REDIS_KEY_WRAP_UP_AT(agentId))
    }
    await this.statusLogRepository.save(
      this.statusLogRepository.create({
        agentId,
        fromStatus,
        toStatus,
        reason: reason ?? null,
      }),
    )
  }

  /** 获取进入 WRAP_UP 超过 120s 的坐席 ID 列表 */
  async getWrapUpOverdueAgentIds(): Promise<number[]> {
    const keys = await this.redis.getClient().keys('agent:wrap_up_at:*')
    const overdue: number[] = []
    const now = Date.now()
    const TTL_MS = 120_000
    for (const key of keys) {
      const val = await this.redis.get(key)
      if (val) {
        const at = parseInt(val, 10)
        if (!Number.isNaN(at) && now - at >= TTL_MS) {
          const agentId = parseInt(key.replace('agent:wrap_up_at:', ''), 10)
          if (!Number.isNaN(agentId)) overdue.push(agentId)
        }
      }
    }
    return overdue
  }
}
