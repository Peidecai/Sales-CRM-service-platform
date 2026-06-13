import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { RedisService } from '../../common/redis'
import { AgentStatusLog } from './entities/agent-status-log.entity'
import { AgentStatus } from './agent-status.service'
import { User } from '../user/user.entity'

const REDIS_KEY_LAST_ASSIGNED = 'agent:last_assigned_index'

export interface DistributionOptions {
  skillIds?: number[]
}

@Injectable()
export class CallDistributionService {
  constructor(
    @InjectRepository(AgentStatusLog)
    private readonly statusLogRepo: Repository<AgentStatusLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redis: RedisService,
  ) {}

  /**
   * 从当前 IDLE 的坐席中按策略选一个。
   */
  async selectAgent(
    idleAgentIds: number[],
    strategy: 'round_robin' | 'least_calls' | 'skill_based',
    options?: DistributionOptions,
  ): Promise<number | null> {
    if (idleAgentIds.length === 0) return null

    if (strategy === 'round_robin') {
      return this.roundRobin(idleAgentIds)
    }
    if (strategy === 'least_calls') {
      return this.leastCalls(idleAgentIds)
    }
    if (strategy === 'skill_based') {
      return this.skillBased(idleAgentIds, options?.skillIds ?? [])
    }
    return idleAgentIds[0] ?? null
  }

  // ── round_robin ──────────────────────────────────────────────
  private async roundRobin(ids: number[]): Promise<number | null> {
    const idx = await this.redis.get(REDIS_KEY_LAST_ASSIGNED)
    const next = (parseInt(idx ?? '0', 10) + 1) % ids.length
    await this.redis.set(REDIS_KEY_LAST_ASSIGNED, String(next))
    return ids[next] ?? ids[0] ?? null
  }

  // ── least_calls ──────────────────────────────────────────────
  /**
   * 查询今日每位候选坐席 ON_CALL 转换次数，选最少的。
   * 平局时选 id 较小的（稳定排序）。
   */
  private async leastCalls(ids: number[]): Promise<number | null> {
    if (ids.length === 1) return ids[0]!

    const counts = await this.getTodayCallCounts(ids)
    let bestId = ids[0]!
    let bestCount = counts.get(bestId) ?? 0

    for (const id of ids) {
      const c = counts.get(id) ?? 0
      if (c < bestCount) {
        bestCount = c
        bestId = id
      }
    }
    return bestId
  }

  // ── skill_based ──────────────────────────────────────────────
  /**
   * 1) 从 idleAgentIds 中过滤出 skills 字段包含 options.skillIds 全部技能的坐席
   * 2) 在匹配坐席中按 least_calls 排序
   * 3) 无匹配时回退到 idleAgentIds 的 least_calls
   */
  private async skillBased(ids: number[], requiredSkillIds: number[]): Promise<number | null> {
    if (requiredSkillIds.length === 0) {
      return this.leastCalls(ids)
    }

    const agents = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'skills'],
    })

    const matched = agents
      .filter((a) => {
        if (!a.skills || a.skills.length === 0) return false
        return requiredSkillIds.every((sid) => a.skills!.includes(sid))
      })
      .map((a) => a.id)

    // Fallback: no agents match all skills → least_calls on full list
    if (matched.length === 0) {
      return this.leastCalls(ids)
    }

    return this.leastCalls(matched)
  }

  // ── helpers ──────────────────────────────────────────────────
  /**
   * 查询今日（00:00 起）各坐席进入 ON_CALL 的次数。
   * 返回 Map<agentId, count>，未出现的 agentId 视为 0。
   */
  private async getTodayCallCounts(ids: number[]): Promise<Map<number, number>> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const rows: { agentId: number; cnt: string }[] = await this.statusLogRepo
      .createQueryBuilder('l')
      .select('l.agent_id', 'agentId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.agent_id IN (:...ids)', { ids })
      .andWhere('l.to_status = :status', { status: AgentStatus.ON_CALL })
      .andWhere('l.created_at >= :start', { start: todayStart })
      .groupBy('l.agent_id')
      .getRawMany()

    const map = new Map<number, number>()
    for (const r of rows) {
      map.set(Number(r.agentId), parseInt(r.cnt, 10))
    }
    return map
  }
}
