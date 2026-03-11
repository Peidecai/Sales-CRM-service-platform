import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SalesTarget } from './sales-target.entity'
import { PerformanceRanking } from './performance-ranking.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { User } from '../user/user.entity'
import { SalesTargetController } from './sales-target.controller'
import { SalesTargetService } from './sales-target.service'
import { SalesTargetScheduler } from './sales-target.scheduler'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesTarget,
      PerformanceRanking,
      Opportunity,
      Customer,
      CallRecord,
      User,
    ]),
  ],
  controllers: [SalesTargetController],
  providers: [SalesTargetService, SalesTargetScheduler],
  exports: [SalesTargetService],
})
export class SalesTargetModule {}
