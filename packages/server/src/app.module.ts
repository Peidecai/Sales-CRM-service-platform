import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { databaseConfig } from './config/database.config'
import { RedisModule } from './common/redis'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { CustomerModule } from './modules/customer/customer.module'
import { OpportunityModule } from './modules/opportunity/opportunity.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { CallRecordModule } from './modules/call-record/call-record.module'
import { AiModule } from './modules/ai/ai.module'

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
      inject: [],
    }),

    // Redis (global)
    RedisModule,

    // Bull queue (backed by Redis)
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', '') || undefined,
          db: config.get<number>('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    HealthModule,
    AiModule,
    CustomerModule,
    OpportunityModule,
    CallRecordModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
