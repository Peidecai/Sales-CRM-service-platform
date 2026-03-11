import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { RecordingFile } from './entities/recording-file.entity'
import { AsrTask } from './entities/asr-task.entity'
import { CallTranscript } from './entities/call-transcript.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { OssRecordingService } from './oss-recording.service'
import { XunfeiAsrAdapter } from './adapters/xunfei-asr.adapter'
import { RecordingService } from './recording.service'
import { RecordingController } from './recording.controller'
import { AsrProcessor } from './asr.processor'

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingFile, AsrTask, CallTranscript, CallRecord]),
    BullModule.registerQueue({ name: 'asr' }),
  ],
  controllers: [RecordingController],
  providers: [
    RecordingService,
    OssRecordingService,
    AsrProcessor,
    { provide: 'ASR_PROVIDER', useClass: XunfeiAsrAdapter },
  ],
  exports: [RecordingService],
})
export class RecordingModule {}
