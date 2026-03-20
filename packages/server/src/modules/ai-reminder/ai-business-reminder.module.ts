import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { OpportunityScore } from './entities/opportunity-score.entity'
import { AiReminder } from './entities/ai-reminder.entity'
import { CompetitorMention } from './entities/competitor-mention.entity'
import { OpportunityScoringService } from './opportunity-scoring.service'
import { AiReminderService } from './ai-reminder.service'
import { CompetitorDetectionService } from './competitor-detection.service'
import { AiScoringProcessor } from './ai-scoring.processor'
import { OpportunityScoringController } from './opportunity-scoring.controller'
import { AiReminderController } from './ai-reminder.controller'
import { CompetitorMentionController } from './competitor-mention.controller'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { CustomerModule } from '../customer/customer.module'
import { CallRecordModule } from '../call-record/call-record.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([OpportunityScore, AiReminder, CompetitorMention]),
    BullModule.registerQueue(
      {
        name: 'ai-scoring',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
      {
        name: 'ai-reminder',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
    ),
    OpportunityModule,
    CustomerModule,
    CallRecordModule,
    AiModule,
  ],
  controllers: [OpportunityScoringController, AiReminderController, CompetitorMentionController],
  providers: [
    OpportunityScoringService,
    AiReminderService,
    CompetitorDetectionService,
    AiScoringProcessor,
  ],
  exports: [OpportunityScoringService, AiReminderService, CompetitorDetectionService],
})
export class AiBusinessReminderModule {}
