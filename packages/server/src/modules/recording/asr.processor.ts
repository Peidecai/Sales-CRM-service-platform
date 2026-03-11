import { Processor, Process } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { RecordingService } from './recording.service'

export interface AsrJobData {
  recordingFileId: number
  recordingUrl: string
}

@Processor('asr')
export class AsrProcessor {
  private readonly logger = new Logger(AsrProcessor.name)

  constructor(private readonly recordingService: RecordingService) {}

  @Process()
  async handleAsr(job: Job<AsrJobData>) {
    const { recordingFileId, recordingUrl } = job.data
    this.logger.log(`Processing ASR for recording file ${recordingFileId}`)
    await this.recordingService.runAsrForTask(recordingFileId, recordingUrl)
  }
}
