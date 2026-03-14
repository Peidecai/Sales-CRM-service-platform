import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AgentStatusLog } from './entities/agent-status-log.entity'
import { AgentStatusService } from './agent-status.service'
import { CallDistributionService } from './call-distribution.service'
import { AgentService } from './agent.service'
import { AgentController } from './agent.controller'
import { AgentWrapUpScheduler } from './agent-wrap-up.scheduler'
import { RedisModule } from '../../common/redis'
import { UserModule } from '../user/user.module'

@Module({
  imports: [TypeOrmModule.forFeature([AgentStatusLog]), RedisModule, UserModule],
  controllers: [AgentController],
  providers: [AgentService, AgentStatusService, CallDistributionService, AgentWrapUpScheduler],
  exports: [AgentStatusService, CallDistributionService],
})
export class AgentModule {}
