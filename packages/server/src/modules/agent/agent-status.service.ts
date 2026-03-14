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
const REDIS_KEY_WRAP_UP_ZSET = 'agent:wrap_up_set'

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
      // ZADD: score = current timestamp, member = agentId
      await this.redis.zAdd(REDIS_KEY_WRAP_UP_ZSET, Date.now(), String(agentId))
    } else {
      // Leaving WRAP_UP (or any other transition) — remove from ZSET
      await this.redis.zRem(REDIS_KEY_WRAP_UP_ZSET, String(agentId))
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
    const TTL_MS = 120_000
    const cutoff = Date.now() - TTL_MS

    // ZRANGEBYSCORE: all members with score <= cutoff (entered WRAP_UP >= 120s ago)
    const members = await this.redis.zRangeByScore(REDIS_KEY_WRAP_UP_ZSET, 0, cutoff)

    return members.map((m) => parseInt(m, 10)).filter((id) => !Number.isNaN(id))
  }
}
