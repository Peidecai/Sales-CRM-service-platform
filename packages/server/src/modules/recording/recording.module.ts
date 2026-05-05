import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { RecordingFile } from './entities/recording-file.entity'
import { AsrTask } from './entities/asr-task.entity'
import { CallTranscript } from './entities/call-transcript.entity'
import { CloudTranscriptionCallback } from './entities/cloud-transcription-callback.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { CallRecordModule } from '../call-record/call-record.module'
import { CustomerModule } from '../customer/customer.module'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { OssRecordingService } from './oss-recording.service'
import { XunfeiAsrAdapter } from './adapters/xunfei-asr.adapter'
import { RecordingService } from './recording.service'
import { RecordingController } from './recording.controller'
import { CloudTranscriptionCallbackController } from './cloud-transcription-callback.controller'
import { CloudTranscriptionCallbackService } from './cloud-transcription-callback.service'
import { AsrProcessor } from './asr.processor'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecordingFile,
      AsrTask,
      CallTranscript,
      CloudTranscriptionCallback,
      CallRecord,
    ]),
    CallRecordModule,
    CustomerModule,
    OpportunityModule,
    BullModule.registerQueue({
      name: 'asr',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
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
        attempts: 6,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
  ],
  controllers: [RecordingController, CloudTranscriptionCallbackController],
  providers: [
    RecordingService,
    CloudTranscriptionCallbackService,
    OssRecordingService,
    AsrProcessor,
    { provide: 'ASR_PROVIDER', useClass: XunfeiAsrAdapter },
  ],
  exports: [RecordingService],
})
export class RecordingModule {}
