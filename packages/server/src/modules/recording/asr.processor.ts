import { Processor, Process, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { RecordingService } from './recording.service'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../notification/notification.types'

export interface AsrJobData {
  recordingFileId: number
  recordingUrl: string
}

@Processor('asr')
export class AsrProcessor {
  private readonly logger = new Logger(AsrProcessor.name)

  constructor(
    private readonly recordingService: RecordingService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process()
  async handleAsr(job: Job<AsrJobData>) {
    const { recordingFileId, recordingUrl } = job.data
    this.logger.log(`Processing ASR for recording file ${recordingFileId}`)
    await this.recordingService.runAsrForTask(recordingFileId, recordingUrl)
  }

  @OnQueueFailed()
  async handleFailed(job: Job<AsrJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    this.logger.error(
      `ASR 语音识别任务失败 (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    )

    if (job.attemptsMade >= maxAttempts) {
      this.notificationService.notify({
        type: NotificationType.QUEUE_JOB_FAILED,
        actorId: 0,
        actorName: '系统',
        resource: 'asr',
        resourceId: job.data.recordingFileId,
        message: `录音文件 #${job.data.recordingFileId} ASR 任务在 ${maxAttempts} 次重试后最终失败: ${error.message}`,
        data: { queue: 'asr', jobId: job.id, error: error.message },
      })
    }
  }
}
