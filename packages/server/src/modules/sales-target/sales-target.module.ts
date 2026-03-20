import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SalesTarget } from './sales-target.entity'
import { PerformanceRanking } from './performance-ranking.entity'
import { SalesTargetController } from './sales-target.controller'
import { SalesTargetService } from './sales-target.service'
import { SalesTargetScheduler } from './sales-target.scheduler'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { CustomerModule } from '../customer/customer.module'
import { CallRecordModule } from '../call-record/call-record.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesTarget, PerformanceRanking]),
    OpportunityModule,
    CustomerModule,
    CallRecordModule,
    UserModule,
  ],
  controllers: [SalesTargetController],
  providers: [SalesTargetService, SalesTargetScheduler],
  exports: [SalesTargetService, TypeOrmModule],
})
export class SalesTargetModule {}
