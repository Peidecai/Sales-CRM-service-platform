import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../user/user.entity'
import { AgentStatusLog } from './entities/agent-status-log.entity'
import { AgentStatusService, AgentStatus } from './agent-status.service'
import { RedisService } from '../../common/redis'
import { UserRole } from '@crm/shared'

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AgentStatusLog)
    private readonly statusLogRepository: Repository<AgentStatusLog>,
    private readonly agentStatus: AgentStatusService,
    private readonly redis: RedisService,
  ) {}

  async list(userRole: string, userId: number, status?: string) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .andWhere('u.isActive = :active', { active: true })
    if (userRole === UserRole.SALES) {
      qb.andWhere('u.id = :uid', { uid: userId })
    }
    const users = await qb.select(['u.id', 'u.name', 'u.username', 'u.role']).getMany()

    if (users.length === 0) return []

    // Batch-fetch all statuses via Redis MGET (fixes N+1)
    const keys = users.map((u) => `agent:status:${u.id}`)
    const values = await this.redis.getClient().mget(...keys)
    const withStatus = users.map((u, i) => ({
      ...u,
      status: (values[i] as AgentStatus) ?? AgentStatus.OFFLINE,
    }))

    if (status) {
      return withStatus.filter((a) => a.status === status)
    }
    return withStatus
  }

  async getOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'username', 'role', 'phone'],
    })
    if (!user) throw new NotFoundException('Agent not found')
    const agentStatus = await this.agentStatus.getStatus(id)
    return { ...user, status: agentStatus }
  }

  async available() {
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id', 'name'],
    })

    if (users.length === 0) return []

    // Batch-fetch via MGET
    const keys = users.map((u) => `agent:status:${u.id}`)
    const values = await this.redis.getClient().mget(...keys)
    return users.filter((_u, i) => (values[i] ?? AgentStatus.OFFLINE) === AgentStatus.IDLE)
  }

  async getStats(id: number) {
    const logs = await this.statusLogRepository.count({
      where: { agentId: id, toStatus: AgentStatus.ON_CALL },
    })
    return {
      agentId: id,
      todayCallCount: logs,
      totalCallCount: logs,
    }
  }

  async statusLogs(agentId: number, startDate?: string, endDate?: string) {
    const qb = this.statusLogRepository
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .orderBy('l.createdAt', 'DESC')
      .take(100)
    if (startDate) qb.andWhere('l.createdAt >= :startDate', { startDate: new Date(startDate) })
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      qb.andWhere('l.createdAt <= :endDate', { endDate: end })
    }
    return qb.getMany()
  }
}
