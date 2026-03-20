import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaymentPlan } from './entities/payment-plan.entity'
import { PaymentPlanItem } from './entities/payment-plan-item.entity'
import { BankStatement } from './entities/bank-statement.entity'
import { PaymentPlanService } from './payment-plan.service'
import { BankStatementService } from './bank-statement.service'
import { PaymentAnalyticsService } from './payment-analytics.service'
import { PaymentPlanController } from './payment-plan.controller'
import { BankStatementController } from './bank-statement.controller'
import { PaymentAnalyticsController } from './payment-analytics.controller'

@Module({
  imports: [TypeOrmModule.forFeature([PaymentPlan, PaymentPlanItem, BankStatement])],
  controllers: [PaymentPlanController, BankStatementController, PaymentAnalyticsController],
  providers: [PaymentPlanService, BankStatementService, PaymentAnalyticsService],
  exports: [PaymentPlanService],
})
export class PaymentTrackingModule {}
