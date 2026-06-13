import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { CallRecord } from './call-record.entity'
import { LeaderReview } from './entities/leader-review.entity'
import { Customer } from '../customer/customer.entity'
import { User } from '../user/user.entity'
import { CallTranscript } from '../recording/entities/call-transcript.entity'
import { RecordingFile } from '../recording/entities/recording-file.entity'
import { CloudTranscriptionCallback } from '../recording/entities/cloud-transcription-callback.entity'
import { CallRecordController } from './call-record.controller'
import { CallRecordService } from './call-record.service'
import { LeaderReviewService } from './leader-review.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CallRecord,
      LeaderReview,
      Customer,
      User,
      CallTranscript,
      RecordingFile,
      CloudTranscriptionCallback,
    ]),
    // Register call-summary queue directly — no need to import all of AiModule for queue access
    BullModule.registerQueue({
      name: 'call-summary',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    BullModule.registerQueue({
      name: 'cloud-transcription-match',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
  ],
  controllers: [CallRecordController],
  providers: [CallRecordService, LeaderReviewService],
  exports: [CallRecordService, LeaderReviewService, TypeOrmModule],
})
export class CallRecordModule {}
