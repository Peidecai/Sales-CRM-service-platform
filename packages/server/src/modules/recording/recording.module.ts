import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { RecordingFile } from './entities/recording-file.entity'
import { AsrTask } from './entities/asr-task.entity'
import { CallTranscript } from './entities/call-transcript.entity'
import { CloudTranscriptionCallback } from './entities/cloud-transcription-callback.entity'
import { UnicomCallCallback } from './entities/unicom-call-callback.entity'
import { UnicomPhoneBinding } from './entities/unicom-phone-binding.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { User } from '../user/user.entity'
import { CallRecordModule } from '../call-record/call-record.module'
import { CustomerModule } from '../customer/customer.module'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { OssRecordingService } from './oss-recording.service'
import { XunfeiAsrAdapter } from './adapters/xunfei-asr.adapter'
import { RecordingService } from './recording.service'
import { RecordingController } from './recording.controller'
import { CloudTranscriptionCallbackController } from './cloud-transcription-callback.controller'
import { UnicomCallbackController } from './unicom-callback.controller'
import { UnicomPhoneBindingController } from './unicom-phone-binding.controller'
import { CloudTranscriptionCallbackService } from './cloud-transcription-callback.service'
import { UnicomCallCallbackService } from './unicom-call-callback.service'
import { UnicomPhoneBindingService } from './unicom-phone-binding.service'
import { AsrProcessor } from './asr.processor'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecordingFile,
      AsrTask,
      CallTranscript,
      CloudTranscriptionCallback,
      UnicomCallCallback,
      UnicomPhoneBinding,
      CallRecord,
      User,
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
  controllers: [
    RecordingController,
    CloudTranscriptionCallbackController,
    UnicomCallbackController,
    UnicomPhoneBindingController,
  ],
  providers: [
    RecordingService,
    CloudTranscriptionCallbackService,
    UnicomCallCallbackService,
    UnicomPhoneBindingService,
    OssRecordingService,
    AsrProcessor,
    { provide: 'ASR_PROVIDER', useClass: XunfeiAsrAdapter },
  ],
  exports: [RecordingService],
})
export class RecordingModule {}
