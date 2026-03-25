import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { databaseConfig } from './config/database.config'
import { RedisModule } from './common/redis'
import { buildRedisOptions } from './common/redis'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { UserModule } from './modules/user/user.module'
import { CustomerModule } from './modules/customer/customer.module'
import { OpportunityModule } from './modules/opportunity/opportunity.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { CallRecordModule } from './modules/call-record/call-record.module'
import { CallModule } from './modules/call/call.module'
import { RecordingModule } from './modules/recording/recording.module'
import { AgentModule } from './modules/agent/agent.module'
import { CampaignModule } from './modules/campaign/campaign.module'
import { AiModule } from './modules/ai/ai.module'
import { AuditLogModule } from './modules/audit-log/audit-log.module'
import { NotificationModule } from './modules/notification/notification.module'
import { FollowUpModule } from './modules/follow-up/follow-up.module'
import { SalesTargetModule } from './modules/sales-target/sales-target.module'
import { ContactModule } from './modules/contact/contact.module'
import { CustomerPoolModule } from './modules/customer-pool/customer-pool.module'
import { CustomerTagModule } from './modules/customer-tag/customer-tag.module'
import { CustomFieldModule } from './modules/custom-field/custom-field.module'
import { MaterialModule } from './modules/material/material.module'
import { AnnouncementModule } from './modules/announcement/announcement.module'
import { RbacModule } from './modules/rbac/rbac.module'
import { SecurityModule } from './common/security/security.module'
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard'
import { RouteModule } from './modules/route/route.module'
import { QuotationModule } from './modules/quotation/quotation.module'
import { PaymentModule } from './modules/payment/payment.module'
import { ContractModule } from './modules/contract/contract.module'
import { ApprovalModule } from './modules/approval/approval.module'
import { ProspectModule } from './modules/prospect/prospect.module'
import { CloudCallModule } from './modules/cloud-call/cloud-call.module'
import { PushModule } from './modules/push/push.module'
import { CheckInModule } from './modules/check-in/check-in.module'
import { AppVersionModule } from './modules/app-version/app-version.module'
import { ProductModule } from './modules/product/product.module'
import { DataMaskingModule } from './modules/data-masking/data-masking.module'
import { PostLoanModule } from './modules/post-loan/post-loan.module'
import { SpeechModule } from './modules/speech/speech.module'
import { ReportModule } from './modules/report/report.module'
import { NegotiationAnalysisModule } from './modules/negotiation/negotiation-analysis.module'
import { CustomerGroupModule } from './modules/customer-group/customer-group.module'
import { ServiceRecordModule } from './modules/service-record/service-record.module'
import { ForumModule } from './modules/forum/forum.module'
import { AiBusinessReminderModule } from './modules/ai-reminder/ai-business-reminder.module'
import { ExamModule } from './modules/exam/exam.module'
import { AiConfigModule } from './modules/ai-config/ai-config.module'
import { PkModule } from './modules/pk/pk.module'
import { TrainingModule } from './modules/training/training.module'
import { SigningModule } from './modules/signing/signing.module'
import { PaymentTrackingModule } from './modules/payment-tracking/payment-tracking.module'
import { SimModule } from './modules/sim/sim.module'
import { TodoModule } from './modules/todo/todo.module'
import { AnnotationModule } from './modules/annotation/annotation.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // Redis (global)
    RedisModule,

    // Rate limiting — global: 200 req/min (tiered per-route via @Throttle)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),

    // Bull queue (backed by Redis — supports both standalone and Sentinel mode)
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: buildRedisOptions(config),
      }),
      inject: [ConfigService],
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // RBAC — permission tables + cache (global)
    RbacModule,

    // Security — encryption, data masking (global)
    SecurityModule,

    // Feature Modules
    AuditLogModule,
    NotificationModule,
    AuthModule,
    HealthModule,
    AiModule,
    UserModule,
    CustomerModule,
    OpportunityModule,
    CallRecordModule,
    CallModule,
    RecordingModule,
    AgentModule,
    CampaignModule,
    KnowledgeModule,
    FollowUpModule,
    SalesTargetModule,
    ContactModule,
    CustomerPoolModule,
    CustomerTagModule,
    CustomFieldModule,
    MaterialModule,
    AnnouncementModule,
    RouteModule,
    QuotationModule,
    PaymentModule,
    ContractModule,
    ApprovalModule,
    ProspectModule,
    CloudCallModule,
    PushModule,
    CheckInModule,
    AppVersionModule,
    ProductModule,
    DataMaskingModule,
    PostLoanModule,
    SpeechModule,
    ReportModule,
    NegotiationAnalysisModule,
    CustomerGroupModule,
    ServiceRecordModule,
    ForumModule,
    AiBusinessReminderModule,
    ExamModule,
    AiConfigModule,
    PkModule,
    TrainingModule,
    SigningModule,
    PaymentTrackingModule,
    SimModule,
    TodoModule,
    AnnotationModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
