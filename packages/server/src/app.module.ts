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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // Redis (global)
    RedisModule,

    // Rate limiting — global: 60 req/min (tiered per-route via @Throttle)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
