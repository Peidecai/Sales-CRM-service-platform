import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Opportunity } from './opportunity.entity'
import { OpportunityStageLog } from './entities/opportunity-stage-log.entity'
import { OpportunityFollowLog } from './entities/opportunity-follow-log.entity'
import { OpportunityController } from './opportunity.controller'
import { OpportunityService } from './opportunity.service'
import { OpportunityFollowLogService } from './opportunity-follow-log.service'

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, OpportunityStageLog, OpportunityFollowLog])],
  controllers: [OpportunityController],
  providers: [OpportunityService, OpportunityFollowLogService],
  exports: [OpportunityService],
})
export class OpportunityModule {}
