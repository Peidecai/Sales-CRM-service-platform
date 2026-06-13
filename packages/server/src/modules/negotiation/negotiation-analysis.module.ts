import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { NegotiationAnalysis } from './entities/negotiation-analysis.entity'
import { NegotiationAnalysisController } from './negotiation-analysis.controller'
import { NegotiationAnalysisService } from './negotiation-analysis.service'
import { NegotiationAnalysisProcessor } from './negotiation-analysis.processor'
import { CallRecordModule } from '../call-record/call-record.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([NegotiationAnalysis]),
    CallRecordModule,
    AiModule,
    BullModule.registerQueue({
      name: 'negotiation-analysis',
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 50,
        removeOnFail: 100,
        timeout: 120000,
      },
    }),
  ],
  controllers: [NegotiationAnalysisController],
  providers: [NegotiationAnalysisService, NegotiationAnalysisProcessor],
  exports: [NegotiationAnalysisService],
})
export class NegotiationAnalysisModule {}
