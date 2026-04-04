import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { ConfigModule } from '@nestjs/config'
import { CloudCallRecord } from './entities/cloud-call-record.entity'
import { CloudCallSettings } from './entities/cloud-call-settings.entity'
import { CloudCallController } from './cloud-call.controller'
import { CloudCallService } from './cloud-call.service'
import { AliyunCCCProvider } from './providers/aliyun-ccc.provider'
import { WebhookSignatureMiddleware } from './middleware/webhook-signature.middleware'
import { CloudCallAnalysisProcessor } from './processors/cloud-call-analysis.processor'
import { CLOUD_CALL_PROVIDER } from './interfaces/cloud-call-provider.interface'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CloudCallRecord, CloudCallSettings]),
    BullModule.registerQueue({
      name: 'cloud-call-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    AiModule,
  ],
  controllers: [CloudCallController],
  providers: [
    CloudCallService,
    AliyunCCCProvider,
    CloudCallAnalysisProcessor,
    {
      provide: CLOUD_CALL_PROVIDER,
      useExisting: AliyunCCCProvider,
    },
  ],
  exports: [CloudCallService, TypeOrmModule],
})
export class CloudCallModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WebhookSignatureMiddleware)
      .forRoutes({ path: 'cloud-call/callback', method: RequestMethod.POST })
  }
}
