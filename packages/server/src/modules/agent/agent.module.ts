import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../user/user.entity'
import { AgentStatusLog } from './entities/agent-status-log.entity'
import { AgentStatusService } from './agent-status.service'
import { CallDistributionService } from './call-distribution.service'
import { AgentController } from './agent.controller'
import { AgentWrapUpScheduler } from './agent-wrap-up.scheduler'
import { RedisModule } from '../../common/redis'

@Module({
  imports: [TypeOrmModule.forFeature([User, AgentStatusLog]), RedisModule],
  controllers: [AgentController],
  providers: [AgentStatusService, CallDistributionService, AgentWrapUpScheduler],
  exports: [AgentStatusService, CallDistributionService],
})
export class AgentModule {}
