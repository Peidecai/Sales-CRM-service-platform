import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common'
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
import { UserRole, RecordingSourceType, CallDirection, CallStatus } from '@crm/shared'
import { OssRecordingService } from './oss-recording.service'
import { UploadRecordingDto } from './dto/upload-recording.dto'

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
    source?: RecordingSourceType,
  ): Promise<{ list: RecordingFile[]; total: number }> {
    const qb = this.recordingFileRepository
      .createQueryBuilder('rf')
      .innerJoin(CallRecord, 'cr', 'cr.id = rf.callRecordId')

    if (user.role === UserRole.SALES) {
      qb.andWhere('(cr.userId = :uid OR cr.agentId = :uid)', { uid: user.id })
    }
    if (callRecordId) qb.andWhere('rf.callRecordId = :callRecordId', { callRecordId })
    if (source) qb.andWhere('rf.sourceType = :source', { source })

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

  async getPlayUrl(ossKey: string, expires = 3600): Promise<string> {
    return this.ossRecording.getSignedUrl(ossKey, expires)
  }

  async triggerAsr(
    recordingId: number,
    user: AuthUser,
  ): Promise<{ taskId: number; status: string }> {
    const file = await this.getRecording(recordingId, user)

    // 过短录音通常没有有效话术内容，跳过 ASR 可减少供应商成本和噪声结果。
    const fileDuration = file.durationSeconds
    const duration =
      fileDuration != null
        ? fileDuration
        : file.callRecordId
          ? await this.callRecordRepository
              .findOne({ where: { id: file.callRecordId } })
              .then((cr) => cr?.duration ?? 0)
          : 0

    if (duration < this.ASR_MIN_DURATION_SECONDS) {
      this.logger.debug(
        `ASR skipped: recording ${recordingId} duration ${duration}s < ${this.ASR_MIN_DURATION_SECONDS}s threshold`,
      )
      return { taskId: 0, status: 'skipped' }
    }

    const existingTask = await this.asrTaskRepository.findOne({
      where: { recordingFileId: recordingId },
      order: { createdAt: 'DESC' },
    })
    // 已存在非失败任务时直接复用，避免用户重复点击造成重复扣费/重复转写。
    if (existingTask && existingTask.status !== AsrTaskStatus.FAILED) {
      return { taskId: existingTask.id, status: existingTask.status }
    }
    let task = this.asrTaskRepository.create({
      recordingFileId: recordingId,
      status: AsrTaskStatus.PENDING,
      provider: 'xunfei',
    })
    task = await this.asrTaskRepository.save(task)
    const recordingUrl = await this.ossRecording.getSignedUrl(file.ossKey, 7200)
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

  /**
   * 上传录音文件（小程序语音速记等场景）。
   * 存储到 OSS，创建 recording_files 记录，可选触发 ASR 转写。
   */
  async uploadRecording(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    callRecordId: number | undefined,
    sourceType: RecordingSourceType,
    user: AuthUser,
  ): Promise<{ recordingFile: RecordingFile; asrTriggered: boolean }> {
    // 1. 验证通话记录存在且有权限（仅当关联通话记录时）
    if (callRecordId) {
      const callRecord = await this.callRecordRepository.findOne({ where: { id: callRecordId } })
      if (!callRecord) throw new NotFoundException(`通话记录 #${callRecordId} 不存在`)
      if (
        user.role === UserRole.SALES &&
        callRecord.userId !== user.id &&
        callRecord.agentId !== user.id
      ) {
        throw new ForbiddenException('您无权为此通话记录上传录音')
      }
    }

    // 2. 校验文件
    const maxSize = 200 * 1024 * 1024 // 200MB
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小超过 200MB 限制')
    }
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
    ]
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的音频格式: ${file.mimetype}`)
    }

    // 3. 生成 OSS key 并上传
    const now = new Date()
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
    const ext = file.originalname.split('.').pop() ?? 'mp3'
    const idSegment = callRecordId ?? `unlinked_${user.id}`
    const ossKey = `recordings/${datePath}/${idSegment}_${Date.now()}.${ext}`

    await this.ossRecording.uploadBuffer(file.buffer, ossKey, file.mimetype)

    // 4. 创建 recording_files 记录
    const recordingFile = this.recordingFileRepository.create({
      callRecordId: callRecordId ?? null,
      fileName: file.originalname,
      ossKey,
      ossBucket: this.ossRecording.getBucket(),
      fileSize: file.size,
      mimeType: file.mimetype,
      sourceType,
    })
    await this.recordingFileRepository.save(recordingFile)

    // ASR 触发失败不回滚录音上传，用户仍可稍后手动重试转写。
    let asrTriggered = false
    try {
      const result = await this.triggerAsr(recordingFile.id, user)
      asrTriggered = result.status !== 'skipped'
    } catch (err) {
      this.logger.warn(
        `ASR trigger failed for uploaded recording #${recordingFile.id}: ${String(err)}`,
      )
    }

    return { recordingFile, asrTriggered }
  }

  /** 供 ASR processor 调用：提交转写并写入 call_transcripts */
  async runAsrForTask(recordingFileId: number, recordingUrl: string): Promise<void> {
    const task = await this.asrTaskRepository.findOne({
      where: { recordingFileId, status: AsrTaskStatus.PENDING },
    })
    // 任务可能已被取消/重试实例接管，非 PENDING 时直接跳过。
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
      await this.asrTaskRepository.save(task)
      throw err
    }
    await this.asrTaskRepository.save(task)
  }

  /**
   * 手动上传录音文件（外部通话/个人手机等）
   * 1. 校验文件格式和大小
   * 2. 存储到本地/OSS
   * 3. 创建 RecordingFile + CallRecord（isManualUpload=true）
   * 4. 投入 ASR 队列
   */
  async uploadManualRecording(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    dto: UploadRecordingDto,
    user: AuthUser,
  ): Promise<{ recordingFile: RecordingFile; callRecord: CallRecord; asrTriggered: boolean }> {
    // 1. 校验格式
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/amr',
      'audio/aac',
      'audio/ogg',
    ]
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的音频格式: ${file.mimetype}，支持 mp3/wav/m4a/amr`)
    }

    // 2. 校验大小
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小超过 100MB 限制')
    }

    // 3. 创建 CallRecord（手动上传标记）
    const callRecord = this.callRecordRepository.create({
      customerId: dto.customerId ?? null,
      opportunityId: dto.opportunityId ?? null,
      userId: user.id,
      callAt: dto.actualCallTime ? new Date(dto.actualCallTime) : new Date(),
      duration: dto.duration ?? 0,
      notes: dto.notes ?? null,
      direction: CallDirection.OUTBOUND,
      status: CallStatus.ENDED,
      isManualUpload: true,
    })
    await this.callRecordRepository.save(callRecord)

    // 4. 上传文件到 OSS
    const now = new Date()
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
    const ext = file.originalname.split('.').pop() ?? 'mp3'
    const uuid = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const ossKey = `recordings/manual/${datePath}/${uuid}.${ext}`

    await this.ossRecording.uploadBuffer(file.buffer, ossKey, file.mimetype)

    // 5. 创建 RecordingFile
    const recordingFile = this.recordingFileRepository.create({
      callRecordId: callRecord.id,
      fileName: file.originalname,
      ossKey,
      ossBucket: this.ossRecording.getBucket(),
      fileSize: file.size,
      mimeType: file.mimetype,
      sourceType: RecordingSourceType.MANUAL_UPLOAD,
      counterpartPhone: dto.counterpartPhone ?? null,
      actualCallTime: dto.actualCallTime ? new Date(dto.actualCallTime) : null,
      uploadedById: user.id,
      notes: dto.notes ?? null,
    })
    await this.recordingFileRepository.save(recordingFile)

    // 手动上传主流程已成功时，ASR 失败只记录告警，不影响文件和通话记录落库。
    let asrTriggered = false
    try {
      const result = await this.triggerAsr(recordingFile.id, user)
      asrTriggered = result.status !== 'skipped'
    } catch (err) {
      this.logger.warn(`ASR trigger failed for manual upload #${recordingFile.id}: ${String(err)}`)
    }

    return { recordingFile, callRecord, asrTriggered }
  }

  /**
   * 批量手动上传录音
   */
  async batchUploadManual(
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>,
    dtos: UploadRecordingDto[],
    user: AuthUser,
  ): Promise<
    Array<{
      success: boolean
      recordingFile?: RecordingFile
      callRecord?: CallRecord
      error?: string
    }>
  > {
    const results: Array<{
      success: boolean
      recordingFile?: RecordingFile
      callRecord?: CallRecord
      error?: string
    }> = []
    for (let i = 0; i < files.length; i++) {
      try {
        const dto = dtos[i] ?? {}
        const result = await this.uploadManualRecording(files[i], dto, user)
        results.push({
          success: true,
          recordingFile: result.recordingFile,
          callRecord: result.callRecord,
        })
      } catch (err) {
        results.push({ success: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
    return results
  }
}
