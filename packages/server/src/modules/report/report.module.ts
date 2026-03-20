import { Module } from '@nestjs/common'
import { CallRecordModule } from '../call-record/call-record.module'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { CustomerModule } from '../customer/customer.module'
import { ContractModule } from '../contract/contract.module'
import { PaymentModule } from '../payment/payment.module'
import { SalesTargetModule } from '../sales-target/sales-target.module'
import { UserModule } from '../user/user.module'
import { ReportController } from './report.controller'
import { CallReportService } from './call-report.service'
import { PerformanceReportService } from './performance-report.service'
import { AiReportService } from './ai-report.service'
import { FunnelReportService } from './funnel-report.service'
import { ScreenService } from './screen.service'

@Module({
  imports: [
    CallRecordModule,
    OpportunityModule,
    CustomerModule,
    ContractModule,
    PaymentModule,
    SalesTargetModule,
    UserModule,
  ],
  controllers: [ReportController],
  providers: [
    CallReportService,
    PerformanceReportService,
    AiReportService,
    FunnelReportService,
    ScreenService,
  ],
})
export class ReportModule {}
