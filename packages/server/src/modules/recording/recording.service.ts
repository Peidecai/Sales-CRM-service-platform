import { Injectable, NotFoundException, ForbiddenException, Inject, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { RecordingFile } from './entities/recording-file.entity'
import { AsrTask, AsrTaskStatus } from './entities/asr-task.entity'
import { CallTranscript, TranscriptSpeaker } from './entities/call-transcript.entity'
import { CallRecord } from '../call-record/call-record.entity'
import type { AsrProviderAdapter } from './adapters/asr-provider.adapter'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { OssRecordingService } from './oss-recording.service'

export interface AsrJobData {
  recordingFileId: number
  recordingUrl: string
}

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name)

  /** Calls shorter than this are too brief for meaningful ASR */
  private readonly ASR_MIN_DURATION_SECONDS = 8
  constructor(
    @InjectRepository(RecordingFile)
    private readonly recordingFileRepository: Repository<RecordingFile>,
    @InjectRepository(AsrTask)
    private readonly asrTaskRepository: Repository<AsrTask>,
    @InjectRepository(CallTranscript)
    private readonly transcriptRepository: Repository<CallTranscript>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @Inject('ASR_PROVIDER')
    private readonly asrAdapter: AsrProviderAdapter,
    @InjectQueue('asr')
    private readonly asrQueue: Queue<AsrJobData>,
    private readonly ossRecording: OssRecordingService,
  ) {}

  async findRecordings(
    callRecordId: number | undefined,
    page: number,
    pageSize: number,
    user: AuthUser,
  ): Promise<{ list: RecordingFile[]; total: number }> {
    const qb = this.recordingFileRepository
      .createQueryBuilder('rf')
      .innerJoin(CallRecord, 'cr', 'cr.id = rf.call_record_id')

    if (user.role === UserRole.SALES) {
      qb.andWhere('(cr.userId = :uid OR cr.agentId = :uid)', { uid: user.id })
    }
    if (callRecordId) qb.andWhere('rf.callRecordId = :callRecordId', { callRecordId })

    qb.orderBy('rf.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async getRecording(id: number, user: AuthUser): Promise<RecordingFile> {
    const file = await this.recordingFileRepository.findOne({
      where: { id },
      relations: ['callRecord'],
    })
    if (!file) throw new NotFoundException('Recording not found')
    if (user.role === UserRole.SALES && file.callRecord) {
      const cr = file.callRecord as CallRecord
      if (cr.userId !== user.id && cr.agentId !== user.id)
        throw new ForbiddenException('No permission')
    }
    return file
  }

  getPlayUrl(ossKey: string, expires = 3600): string {
    return this.ossRecording.getSignedUrl(ossKey, expires)
  }

  async triggerAsr(
    recordingId: number,
    user: AuthUser,
  ): Promise<{ taskId: number; status: string }> {
    const file = await this.getRecording(recordingId, user)

    // Duration guard — skip ASR for calls too short to produce useful transcripts
    const fileDuration = file.durationSeconds
    const duration =
      fileDuration != null
        ? fileDuration
        : await this.callRecordRepository
            .findOne({ where: { id: file.callRecordId } })
            .then((cr) => cr?.duration ?? 0)

    if (duration < this.ASR_MIN_DURATION_SECONDS) {
      this.logger.debug(
        `ASR skipped: recording ${recordingId} duration ${duration}s < ${this.ASR_MIN_DURATION_SECONDS}s threshold`,
      )
      return { taskId: 0, status: 'skipped' }
    }

    let task = await this.asrTaskRepository.findOne({
      where: { recordingFileId: recordingId },
      order: { createdAt: 'DESC' },
    })
    if (task) {
      return { taskId: task.id, status: task.status }
    }
    task = this.asrTaskRepository.create({
      recordingFileId: recordingId,
      status: AsrTaskStatus.PENDING,
      provider: 'xunfei',
    })
    task = await this.asrTaskRepository.save(task)
    const recordingUrl = this.ossRecording.getSignedUrl(file.ossKey, 7200)
    await this.asrQueue.add(
      { recordingFileId: recordingId, recordingUrl },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    )
    return { taskId: task.id, status: task.status }
  }

  async getTranscripts(recordingId: number, user: AuthUser): Promise<CallTranscript[]> {
    await this.getRecording(recordingId, user)
    const tasks = await this.asrTaskRepository.find({
      where: { recordingFileId: recordingId, status: AsrTaskStatus.COMPLETED },
    })
    if (tasks.length === 0) return []
    const taskIds = tasks.map((t) => t.id)
    return this.transcriptRepository.find({
      where: { asrTaskId: In(taskIds) },
      order: { segmentIndex: 'ASC' },
    })
  }

  /** 供 ASR processor 调用：提交转写并写入 call_transcripts */
  async runAsrForTask(recordingFileId: number, recordingUrl: string): Promise<void> {
    const task = await this.asrTaskRepository.findOne({
      where: { recordingFileId, status: AsrTaskStatus.PENDING },
    })
    if (!task) return
    task.status = AsrTaskStatus.PROCESSING
    task.startedAt = new Date()
    await this.asrTaskRepository.save(task)
    try {
      const { externalTaskId } = await this.asrAdapter.submitTask(recordingUrl)
      task.externalTaskId = externalTaskId
      await this.asrTaskRepository.save(task)
      const segments = await this.asrAdapter.pollOrWebhookResult(externalTaskId)
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i]
        const speaker =
          s.speaker === 'agent'
            ? TranscriptSpeaker.AGENT
            : s.speaker === 'customer'
              ? TranscriptSpeaker.CUSTOMER
              : TranscriptSpeaker.UNKNOWN
        await this.transcriptRepository.save(
          this.transcriptRepository.create({
            asrTaskId: task.id,
            segmentIndex: s.segmentIndex ?? i,
            startTimeMs: s.startTimeMs,
            endTimeMs: s.endTimeMs,
            speaker,
            text: s.text,
          }),
        )
      }
      task.status = AsrTaskStatus.COMPLETED
      task.completedAt = new Date()
    } catch (err) {
      task.status = AsrTaskStatus.FAILED
      task.errorMessage = err instanceof Error ? err.message : String(err)
      task.completedAt = new Date()
      throw err
    }
    await this.asrTaskRepository.save(task)
  }
}
