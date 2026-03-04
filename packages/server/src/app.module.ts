import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { databaseConfig } from './config/database.config'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { CustomerModule } from './modules/customer/customer.module'
import { OpportunityModule } from './modules/opportunity/opportunity.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { CallRecordModule } from './modules/call-record/call-record.module'

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

    // Feature Modules
    AuthModule,
    HealthModule,
    CustomerModule,
    OpportunityModule,
    CallRecordModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
