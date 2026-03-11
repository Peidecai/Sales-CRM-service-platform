import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { AgentStatusService, AgentStatus } from './agent-status.service'

@Injectable()
export class AgentWrapUpScheduler {
  constructor(private readonly agentStatus: AgentStatusService) {}

  @Cron('0 * * * * *')
  async handleWrapUpTimeout() {
    const overdue = await this.agentStatus.getWrapUpOverdueAgentIds()
    for (const agentId of overdue) {
      try {
        await this.agentStatus.transition(agentId, AgentStatus.IDLE, 'auto_timeout')
      } catch {
        // ignore invalid state
      }
    }
  }
}
