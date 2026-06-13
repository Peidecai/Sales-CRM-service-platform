import { Module } from '@nestjs/common'
import { CallRecordModule } from '../call-record/call-record.module'
import { CustomerModule } from '../customer/customer.module'
import { FollowUpModule } from '../follow-up/follow-up.module'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [CallRecordModule, CustomerModule, FollowUpModule, OpportunityModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
