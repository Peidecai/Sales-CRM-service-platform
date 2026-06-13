import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue, Process, Processor } from '@nestjs/bull'
import { InjectRepository } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { Job, Queue } from 'bull'
import { createHash, timingSafeEqual } from 'crypto'
import { Repository } from 'typeorm'
import { CallType, RecordingSourceType } from '@crm/shared'
import { CallRecord } from '../call-record/call-record.entity'
import type { CallSummaryJobData } from '../ai/processors/call-summary.processor'
import {
  CloudTranscriptionCallback,
  CloudTranscriptionMatchStatus,
} from './entities/cloud-transcription-callback.entity'
import { RecordingFile } from './entities/recording-file.entity'
import { AsrTask, AsrTaskStatus } from './entities/asr-task.entity'
import { CallTranscript, TranscriptSpeaker } from './entities/call-transcript.entity'
import {
  CloudTranscriptionCallbackBodyDto,
  CloudTranscriptionCallbackQueryDto,
  CloudTranscriptionCallbackResponse,
} from './dto/cloud-transcription-callback.dto'
import { UnicomPhoneBindingService } from './unicom-phone-binding.service'

type CloudTranscriptionSegment = CloudTranscriptionCallbackBodyDto['result'][number]
type CallbackCredentialContext = 'cloud' | 'unicom'

interface CallbackCredential {
  token: string
  salt: string
  tokenKey: string
  saltKey: string
}

interface SignatureCandidate {
  label: string
  signature: string
}

interface SignatureValidationResult {
  valid: boolean
  reason: string
  credential: CallbackCredential | null
  candidates: SignatureCandidate[]
  diagnosticCandidates: SignatureCandidate[]
}

interface MatchResult {
  status: CloudTranscriptionMatchStatus
  reason: string
  record?: CallRecord
}

interface CloudTranscriptionMatchJobData {
  taskId?: string
  callRecordId?: number
}

const CLOUD_TRANSCRIPTION_PROVIDER = 'cloud-transcription'
const CLOUD_TRANSCRIPTION_SUCCESS_CODE = 21050000

/**
 * 接收云端转写回调，并把第三方任务结果归并到本地通话记录。
 *
 * 关键约束：
 * - 回调可能早于小程序原生外呼记录入库，所以未匹配结果先保存为 PENDING。
 * - 同一个 taskId 可能重复回调，所有落库都按 upsert/覆盖最新载荷处理。
 * - 匹配成功后才写入录音文件、ASR 任务、转写分段，并触发 AI 摘要。
 */
@Processor('cloud-transcription-match')
@Injectable()
export class CloudTranscriptionCallbackService {
  private readonly logger = new Logger(CloudTranscriptionCallbackService.name)

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(CloudTranscriptionCallback)
    private readonly callbackRepository: Repository<CloudTranscriptionCallback>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @InjectRepository(RecordingFile)
    private readonly recordingFileRepository: Repository<RecordingFile>,
    @InjectRepository(AsrTask)
    private readonly asrTaskRepository: Repository<AsrTask>,
    @InjectRepository(CallTranscript)
    private readonly transcriptRepository: Repository<CallTranscript>,
    @InjectQueue('call-summary')
    private readonly callSummaryQueue: Queue<CallSummaryJobData>,
    @InjectQueue('cloud-transcription-match')
    private readonly transcriptionMatchQueue: Queue<CloudTranscriptionMatchJobData>,
    private readonly phoneBindingService: UnicomPhoneBindingService,
  ) {}

  @Process()
  async handlePendingMatchRetry(job: Job<CloudTranscriptionMatchJobData>): Promise<void> {
    if (job.data.taskId) {
      await this.retryPendingMatch(job.data.taskId)
      return
    }

    if (job.data.callRecordId) {
      await this.retryPendingCallbacksForRecord(job.data.callRecordId)
    }
  }

  async handleCallback(
    query: CloudTranscriptionCallbackQueryDto,
    rawBody: Record<string, unknown>,
    routePhone?: string,
    credentialContext: CallbackCredentialContext = 'cloud',
    rawBodyText?: string,
  ): Promise<CloudTranscriptionCallbackResponse> {
    const taskIdForLog = this.getRequiredString(rawBody.taskId) ?? 'unknown'
    const normalizedRoutePhone = this.normalizePhone(routePhone)

    if (routePhone !== undefined && !this.isValidRoutePhone(normalizedRoutePhone)) {
      this.logger.warn(
        `Rejected cloud transcription callback: invalid route phone, taskId=${taskIdForLog}`,
      )
      return this.failure('invalid route phone')
    }

    const credentialRoutePhone = await this.resolveBoundRoutePhone(normalizedRoutePhone)
    const signatureResult = this.validateSignature(
      query,
      rawBody,
      credentialRoutePhone,
      credentialContext,
      rawBodyText,
    )
    if (!signatureResult.valid) {
      this.logSignatureDiagnostics(
        taskIdForLog,
        query,
        rawBody,
        normalizedRoutePhone,
        credentialContext,
        rawBodyText,
        signatureResult,
      )
      this.logger.warn(
        `Rejected cloud transcription callback: invalid signature, taskId=${taskIdForLog}`,
      )
      return this.failure('invalid sign')
    }

    const body = this.parseCallbackBody(rawBody)
    if (!body) {
      this.logger.warn(
        `Rejected cloud transcription callback: invalid body, taskId=${taskIdForLog}`,
      )
      return this.failure('invalid body')
    }

    const transcriptText = this.extractTranscriptText(body)
    const callback = await this.saveCallbackPayload(body, rawBody, transcriptText)
    const match = await this.findMatchingCallRecord(body)
    const providerSucceeded = this.isSuccessfulStatus(body)

    if (match.record) {
      await this.persistMatchedCallback(
        callback,
        body,
        match.record,
        match.reason,
        providerSucceeded,
      )
    } else {
      // 供应商失败状态不需要继续等待本地通话，只保留失败原因供排查。
      callback.matchedCallRecordId = null
      callback.matchStatus =
        providerSucceeded || match.status === CloudTranscriptionMatchStatus.AMBIGUOUS
          ? match.status
          : CloudTranscriptionMatchStatus.FAILED
      callback.matchReason = providerSucceeded
        ? match.reason
        : `provider failed: ${body.statusCode}/${body.statusText}; ${match.reason}`
      await this.callbackRepository.save(callback)

      if (callback.matchStatus === CloudTranscriptionMatchStatus.PENDING) {
        await this.schedulePendingMatchRetry(body.taskId)
      }
    }

    this.logger.log(
      `Received cloud transcription callback: taskId=${body.taskId}, callSid=${body.callSid}, status=${body.statusCode}/${body.statusText}, match=${callback.matchStatus}, callRecordId=${callback.matchedCallRecordId ?? 'none'}, segments=${body.result.length}, textLength=${transcriptText.length}`,
    )
    return { message: 'success', success: true, code: 1, data: true }
  }

  private async retryPendingMatch(taskId: string, throwOnPending = true): Promise<void> {
    const callback = await this.callbackRepository.findOne({ where: { taskId } })
    if (!callback || callback.matchStatus !== CloudTranscriptionMatchStatus.PENDING) return

    const body = this.buildBodyFromCallback(callback)
    const match = await this.findMatchingCallRecord(body)

    if (match.record) {
      await this.persistMatchedCallback(
        callback,
        body,
        match.record,
        match.reason,
        this.isSuccessfulStatus(body),
      )
      return
    }

    if (match.status === CloudTranscriptionMatchStatus.AMBIGUOUS) {
      callback.matchStatus = CloudTranscriptionMatchStatus.AMBIGUOUS
      callback.matchReason = match.reason
      await this.callbackRepository.save(callback)
      return
    }

    if (throwOnPending) {
      throw new Error(match.reason)
    }
  }

  private async retryPendingCallbacksForRecord(callRecordId: number): Promise<void> {
    const record = await this.callRecordRepository.findOne({ where: { id: callRecordId } })
    if (!record) return

    // 本地通话后到时，只扫描通话时间附近的 PENDING 回调，避免全表重试。
    const windowMs = this.getNumberConfig('CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS', 10 * 60 * 1000)
    const lookaheadMs = this.getNumberConfig(
      'CLOUD_TRANSCRIPTION_PENDING_MATCH_LOOKAHEAD_MS',
      2 * 60 * 60 * 1000,
    )
    const callAtMs = record.callAt.getTime()
    const durationMs = this.getRecordDurationSeconds(record) ?? 0
    const from = new Date(callAtMs - windowMs)
    const to = new Date(callAtMs + durationMs * 1000 + lookaheadMs)

    const pendingCallbacks = await this.callbackRepository
      .createQueryBuilder('cb')
      .where('cb.matchStatus = :status', { status: CloudTranscriptionMatchStatus.PENDING })
      .andWhere('(cb.requestTime BETWEEN :from AND :to OR cb.solveTime BETWEEN :from AND :to)', {
        from,
        to,
      })
      .orderBy('cb.createdAt', 'DESC')
      .take(200)
      .getMany()

    for (const callback of pendingCallbacks) {
      await this.retryPendingMatch(callback.taskId, false)
    }
  }

  private async schedulePendingMatchRetry(taskId: string): Promise<void> {
    await this.transcriptionMatchQueue.add(
      { taskId },
      {
        attempts: 6,
        backoff: { type: 'exponential', delay: 30000 },
        delay: 30000,
        jobId: `cloud-transcription-match:${taskId}`,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    )
  }

  parseCallbackBody(raw: Record<string, unknown>): CloudTranscriptionCallbackBodyDto | null {
    if (!raw || typeof raw !== 'object') return null

    if (!Array.isArray(raw.result)) return null
    const parsedSegments = raw.result.map((item) => this.parseSegment(item))
    if (parsedSegments.some((item) => item === null)) return null
    const result = parsedSegments as CloudTranscriptionSegment[]

    const statusCode = this.getNumber(raw.statusCode)
    const statusText = this.getRequiredString(raw.statusText)
    const taskId = this.getRequiredString(raw.taskId)
    const callSid = this.getRequiredString(raw.callSid)
    const enableCallback = this.getBoolean(raw.enableCallback)
    const bizDuration = this.getNumericStringOrNumber(raw.bizDuration)
    const requestTime = this.getNumericStringOrNumber(raw.requestTime)
    const solveTime = this.getNumericStringOrNumber(raw.solveTime)

    if (
      statusCode === null ||
      statusText === null ||
      taskId === null ||
      callSid === null ||
      enableCallback === null ||
      bizDuration === null ||
      requestTime === null ||
      solveTime === null
    ) {
      return null
    }

    return {
      bizDuration,
      enableCallback,
      requestTime,
      result,
      solveTime,
      statusCode,
      statusText,
      taskId,
      callSid,
    }
  }

  extractTranscriptText(body: CloudTranscriptionCallbackBodyDto): string {
    return body.result
      .map((segment) => segment.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join('\n')
  }

  private async saveCallbackPayload(
    body: CloudTranscriptionCallbackBodyDto,
    rawBody: Record<string, unknown>,
    transcriptText: string,
  ): Promise<CloudTranscriptionCallback> {
    const existing = await this.callbackRepository.findOne({ where: { taskId: body.taskId } })
    const callback =
      existing ??
      this.callbackRepository.create({
        taskId: body.taskId,
        matchStatus: CloudTranscriptionMatchStatus.PENDING,
      })

    callback.taskId = body.taskId
    callback.callSid = body.callSid
    callback.statusCode = body.statusCode
    callback.statusText = body.statusText
    callback.bizDurationMs = this.toFiniteNumber(body.bizDuration)
    callback.requestTime = this.toDate(body.requestTime)
    callback.solveTime = this.toDate(body.solveTime)
    callback.rawPayload = rawBody
    callback.transcriptText = transcriptText || null
    callback.segments = body.result
    callback.matchedCallRecordId = existing?.matchedCallRecordId ?? null
    callback.matchStatus = existing?.matchStatus ?? CloudTranscriptionMatchStatus.PENDING
    callback.matchReason = existing?.matchReason ?? null

    return this.saveCallbackEntity(callback)
  }

  private buildBodyFromCallback(
    callback: CloudTranscriptionCallback,
  ): CloudTranscriptionCallbackBodyDto {
    const rawEnableCallback = callback.rawPayload?.enableCallback
    return {
      bizDuration: callback.bizDurationMs,
      enableCallback: typeof rawEnableCallback === 'boolean' ? rawEnableCallback : true,
      requestTime: new Date(callback.requestTime).getTime(),
      result: callback.segments,
      solveTime: new Date(callback.solveTime).getTime(),
      statusCode: callback.statusCode,
      statusText: callback.statusText,
      taskId: callback.taskId,
      callSid: callback.callSid,
    }
  }

  private async findMatchingCallRecord(
    body: CloudTranscriptionCallbackBodyDto,
  ): Promise<MatchResult> {
    // 平台外呼优先使用厂商 callSid 精确匹配。
    const direct = await this.callRecordRepository.findOne({
      where: { providerCallId: body.callSid },
    })

    if (direct) {
      return {
        status: CloudTranscriptionMatchStatus.MATCHED,
        reason: 'matched by provider callSid',
        record: direct,
      }
    }

    const candidates = await this.findFuzzyCandidates(body)
    if (candidates.length === 1) {
      return {
        status: CloudTranscriptionMatchStatus.MATCHED,
        reason: 'matched by local native outbound metadata',
        record: candidates[0],
      }
    }

    if (candidates.length > 1) {
      return {
        status: CloudTranscriptionMatchStatus.AMBIGUOUS,
        reason: `ambiguous native outbound metadata candidates: ${candidates.map((item) => item.id).join(',')}`,
      }
    }

    return {
      status: CloudTranscriptionMatchStatus.PENDING,
      reason: 'no matching local native outbound call record',
    }
  }

  private async findFuzzyCandidates(
    body: CloudTranscriptionCallbackBodyDto,
  ): Promise<CallRecord[]> {
    const requestTimeMs = this.toFiniteNumber(body.requestTime)
    const solveTimeMs = this.toFiniteNumber(body.solveTime)
    const durationSec = this.bizDurationSeconds(body)
    const durationMs = durationSec * 1000
    const anchors = [requestTimeMs, durationMs > 0 ? solveTimeMs - durationMs : solveTimeMs].filter(
      (value) => Number.isFinite(value),
    )
    // 原生拨号没有厂商通话 ID，只能用开始时间/结束时间反推一个可信匹配窗口。
    const windowMs = this.getNumberConfig('CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS', 10 * 60 * 1000)
    const durationToleranceSec = this.getNumberConfig(
      'CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS',
      120,
    )
    const from = new Date(Math.min(...anchors) - windowMs)
    const to = new Date(Math.max(...anchors) + windowMs)

    const roughCandidates = await this.callRecordRepository
      .createQueryBuilder('cr')
      .where('cr.callType = :callType', { callType: CallType.MANUAL })
      .andWhere(
        '(cr.providerCallId IS NULL OR cr.providerCallId = :empty OR cr.providerCallId = :callSid)',
        {
          empty: '',
          callSid: body.callSid,
        },
      )
      .andWhere('cr.callAt BETWEEN :from AND :to', { from, to })
      .orderBy('cr.callAt', 'DESC')
      .getMany()

    return roughCandidates.filter((record) => {
      const callAtMs = record.callAt?.getTime()
      if (!Number.isFinite(callAtMs)) return false
      const timeMatches = anchors.some((anchor) => Math.abs(callAtMs - anchor) <= windowMs)
      if (!timeMatches) return false

      const recordedDuration = this.getRecordDurationSeconds(record)
      if (!recordedDuration || durationSec <= 0) return true
      return Math.abs(recordedDuration - durationSec) <= durationToleranceSec
    })
  }

  private async persistMatchedCallback(
    callback: CloudTranscriptionCallback,
    body: CloudTranscriptionCallbackBodyDto,
    record: CallRecord,
    matchReason: string,
    providerSucceeded: boolean,
  ): Promise<void> {
    const durationSec = this.bizDurationSeconds(body)
    let callRecordChanged = false

    // 补齐本地原生外呼缺失的厂商 ID 和时长，后续回调即可走精确匹配。
    if (!record.providerCallId) {
      record.providerCallId = body.callSid
      callRecordChanged = true
    }
    if ((!record.duration || record.duration <= 0) && durationSec > 0) {
      record.duration = durationSec
      callRecordChanged = true
    }
    if (record.estimatedDuration == null && durationSec > 0) {
      record.estimatedDuration = durationSec
      callRecordChanged = true
    }
    if (callRecordChanged) {
      await this.callRecordRepository.save(record)
    }

    const recordingFile = await this.upsertRecordingFile(record, body, durationSec)
    const asrTask = await this.upsertAsrTask(recordingFile, body, providerSucceeded)

    if (providerSucceeded) {
      // 重复回调以最新分段为准，先清旧分段再批量写入。
      await this.transcriptRepository.delete({ asrTaskId: asrTask.id })
      const transcripts = body.result.map((segment, index) =>
        this.transcriptRepository.create({
          asrTaskId: asrTask.id,
          segmentIndex: index,
          startTimeMs: segment.beginTime,
          endTimeMs: segment.endTime,
          speaker: this.speakerForChannel(segment.channelId),
          text: segment.text,
        }),
      )
      if (transcripts.length > 0) {
        await this.transcriptRepository.save(transcripts)
      }

      if (this.extractTranscriptText(body)) {
        await this.callSummaryQueue.add(
          { callRecordId: record.id },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            jobId: `cloud-transcription:${body.taskId}:${record.id}`,
          },
        )
      }
    }

    callback.matchedCallRecordId = record.id
    callback.matchStatus = CloudTranscriptionMatchStatus.MATCHED
    callback.matchReason = providerSucceeded
      ? matchReason
      : `${matchReason}; provider failed: ${body.statusCode}/${body.statusText}`
    await this.callbackRepository.save(callback)
  }

  private async upsertRecordingFile(
    record: CallRecord,
    body: CloudTranscriptionCallbackBodyDto,
    durationSec: number,
  ): Promise<RecordingFile> {
    const ossKey = `cloud-transcription/${body.callSid}/${body.taskId}.json`
    const existing = await this.recordingFileRepository.findOne({ where: { ossKey } })
    const recordingFile = existing ?? this.recordingFileRepository.create({ ossKey })

    recordingFile.callRecordId = record.id
    recordingFile.fileName = `${body.callSid || body.taskId}.transcription.json`
    recordingFile.ossKey = ossKey
    recordingFile.ossBucket = null
    recordingFile.fileSize = null
    recordingFile.durationSeconds = durationSec > 0 ? durationSec : null
    recordingFile.mimeType = 'application/json'
    recordingFile.sourceType = RecordingSourceType.PLATFORM
    recordingFile.counterpartPhone = null
    recordingFile.actualCallTime = record.callAt
    recordingFile.uploadedById = record.userId
    recordingFile.notes = 'Cloud transcription callback'

    return this.recordingFileRepository.save(recordingFile)
  }

  private async upsertAsrTask(
    recordingFile: RecordingFile,
    body: CloudTranscriptionCallbackBodyDto,
    providerSucceeded: boolean,
  ): Promise<AsrTask> {
    const existing = await this.asrTaskRepository.findOne({
      where: { externalTaskId: body.taskId, provider: CLOUD_TRANSCRIPTION_PROVIDER },
    })
    const task =
      existing ??
      this.asrTaskRepository.create({
        externalTaskId: body.taskId,
        provider: CLOUD_TRANSCRIPTION_PROVIDER,
      })

    task.recordingFileId = recordingFile.id
    task.externalTaskId = body.taskId
    task.provider = CLOUD_TRANSCRIPTION_PROVIDER
    task.status = providerSucceeded ? AsrTaskStatus.COMPLETED : AsrTaskStatus.FAILED
    task.errorMessage = providerSucceeded ? null : `${body.statusCode}/${body.statusText}`
    task.startedAt = this.toDate(body.requestTime)
    task.completedAt = this.toDate(body.solveTime)

    return this.asrTaskRepository.save(task)
  }

  private validateSignature(
    query: CloudTranscriptionCallbackQueryDto,
    body: Record<string, unknown>,
    routePhone?: string,
    credentialContext: CallbackCredentialContext = 'cloud',
    rawBodyText?: string,
  ): SignatureValidationResult {
    const credential = this.resolveCredential(routePhone, credentialContext)
    if (!credential) {
      return {
        valid: false,
        reason: 'missing credential',
        credential: null,
        candidates: [],
        diagnosticCandidates: [],
      }
    }
    const { token: expectedToken, salt } = credential
    if (!expectedToken || !salt || query.token !== expectedToken) {
      return {
        valid: false,
        reason: 'token mismatch',
        credential,
        candidates: [],
        diagnosticCandidates: [],
      }
    }

    const timestamp = Number(query.timestamp)
    const toleranceMs = this.getTimestampToleranceMs()
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > toleranceMs) {
      return {
        valid: false,
        reason: 'timestamp invalid or expired',
        credential,
        candidates: [],
        diagnosticCandidates: [],
      }
    }

    const candidates = this.buildAcceptedSignatureCandidates(query, body, salt)
    if (credentialContext === 'unicom') {
      candidates.push(...this.buildUnicomBodySignatureCandidates(query, body, rawBodyText, salt))
    }
    const valid = candidates.some((candidate) => this.safeEquals(candidate.signature, query.sign))
    const diagnosticCandidates = valid
      ? []
      : this.buildDiagnosticSignatureCandidates(query, body, rawBodyText, salt)

    return {
      valid,
      reason: valid ? 'matched' : 'candidate mismatch',
      credential,
      candidates,
      diagnosticCandidates,
    }
  }

  private buildAcceptedSignatureCandidates(
    query: CloudTranscriptionCallbackQueryDto,
    body: Record<string, unknown>,
    salt: string,
  ): SignatureCandidate[] {
    const timestampValues: Array<string | number> = [query.timestamp]
    const timestamp = Number(query.timestamp)
    if (String(timestamp) === query.timestamp) timestampValues.push(timestamp)

    const candidates: SignatureCandidate[] = []

    // 兼容厂商文档/实际回调中的两种签名串和单/双 MD5 写法。
    for (const timestampValue of timestampValues) {
      const signedPayload = { ...body, timestamp: timestampValue, token: query.token }
      const timestampLabel = typeof timestampValue === 'number' ? 'ts-number' : 'ts-string'
      for (const source of [
        { label: `object-json-${timestampLabel}`, value: JSON.stringify(signedPayload) },
        { label: `stable-json-${timestampLabel}`, value: this.stableStringify(signedPayload) },
        {
          label: `sorted-fields-${timestampLabel}`,
          value: this.joinSortedFields(signedPayload),
        },
      ]) {
        this.addMd5Candidates(candidates, source.label, source.value, salt)
      }
    }

    return this.uniqueCandidates(candidates)
  }

  private buildDiagnosticSignatureCandidates(
    query: CloudTranscriptionCallbackQueryDto,
    body: Record<string, unknown>,
    rawBodyText: string | undefined,
    salt: string,
  ): SignatureCandidate[] {
    const candidates: SignatureCandidate[] = []
    const bodyJson = JSON.stringify(body)
    const sources = [
      { label: 'body-json-only', value: bodyJson },
      { label: 'body-json-ts-token', value: `${bodyJson}${query.timestamp}${query.token}` },
      { label: 'body-json-token-ts', value: `${bodyJson}${query.token}${query.timestamp}` },
      { label: 'ts-token-body-json', value: `${query.timestamp}${query.token}${bodyJson}` },
      { label: 'token-ts-body-json', value: `${query.token}${query.timestamp}${bodyJson}` },
      { label: 'sorted-fields-body-only', value: this.joinSortedFields(body) },
    ]

    for (const source of sources) {
      this.addMd5Candidates(candidates, source.label, source.value, salt)
    }

    if (rawBodyText) {
      for (const source of [
        { label: 'raw-body-only', value: rawBodyText },
        { label: 'raw-body-ts-token', value: `${rawBodyText}${query.timestamp}${query.token}` },
        { label: 'raw-body-token-ts', value: `${rawBodyText}${query.token}${query.timestamp}` },
        { label: 'ts-token-raw-body', value: `${query.timestamp}${query.token}${rawBodyText}` },
        { label: 'token-ts-raw-body', value: `${query.token}${query.timestamp}${rawBodyText}` },
      ]) {
        this.addMd5Candidates(candidates, source.label, source.value, salt)
      }
    }

    return this.uniqueCandidates(candidates)
  }

  private buildUnicomBodySignatureCandidates(
    query: CloudTranscriptionCallbackQueryDto,
    body: Record<string, unknown>,
    rawBodyText: string | undefined,
    salt: string,
  ): SignatureCandidate[] {
    const candidates: SignatureCandidate[] = []
    const bodyJson = JSON.stringify(body)
    candidates.push({
      label: 'unicom-body-json-token-ts:md5',
      signature: this.md5(`${bodyJson}${query.token}${query.timestamp}${salt}`),
    })

    if (rawBodyText && rawBodyText !== bodyJson) {
      candidates.push({
        label: 'unicom-raw-body-token-ts:md5',
        signature: this.md5(`${rawBodyText}${query.token}${query.timestamp}${salt}`),
      })
    }

    return this.uniqueCandidates(candidates)
  }

  private addMd5Candidates(
    candidates: SignatureCandidate[],
    label: string,
    source: string,
    salt: string,
  ): void {
    const first = this.md5(`${source}${salt}`)
    candidates.push({ label: `${label}:md5`, signature: first })
    candidates.push({ label: `${label}:md5-md5`, signature: this.md5(first) })
  }

  private uniqueCandidates(candidates: SignatureCandidate[]): SignatureCandidate[] {
    const seen = new Set<string>()
    return candidates.filter((candidate) => {
      const key = `${candidate.label}:${candidate.signature}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private resolveCredential(
    routePhone?: string,
    credentialContext: CallbackCredentialContext = 'cloud',
  ): CallbackCredential | null {
    const suffix = this.normalizePhone(routePhone)
    const phoneTokenKeys = [
      suffix ? `UNICOM_CALLBACK_TOKEN_${suffix}` : '',
      suffix ? `UNICOM_TRANSCRIPTION_CALLBACK_TOKEN_${suffix}` : '',
    ]
    const phoneSaltKeys = [
      suffix ? `UNICOM_CALLBACK_SALT_${suffix}` : '',
      suffix ? `UNICOM_TRANSCRIPTION_CALLBACK_SALT_${suffix}` : '',
    ]

    const globalTokenKeys =
      credentialContext === 'unicom'
        ? [
            'UNICOM_CALLBACK_TOKEN',
            'UNICOM_TRANSCRIPTION_CALLBACK_TOKEN',
            'CLOUD_TRANSCRIPTION_CALLBACK_TOKEN',
          ]
        : [
            'CLOUD_TRANSCRIPTION_CALLBACK_TOKEN',
            'UNICOM_TRANSCRIPTION_CALLBACK_TOKEN',
            'UNICOM_CALLBACK_TOKEN',
          ]
    const globalSaltKeys =
      credentialContext === 'unicom'
        ? [
            'UNICOM_CALLBACK_SALT',
            'UNICOM_TRANSCRIPTION_CALLBACK_SALT',
            'CLOUD_TRANSCRIPTION_CALLBACK_SALT',
          ]
        : [
            'CLOUD_TRANSCRIPTION_CALLBACK_SALT',
            'UNICOM_TRANSCRIPTION_CALLBACK_SALT',
            'UNICOM_CALLBACK_SALT',
          ]

    const token = this.firstConfigEntry([...phoneTokenKeys, ...globalTokenKeys])
    const salt = this.firstConfigEntry([...phoneSaltKeys, ...globalSaltKeys])

    return token && salt
      ? { token: token.value, salt: salt.value, tokenKey: token.key, saltKey: salt.key }
      : null
  }

  private async resolveBoundRoutePhone(routePhone?: string): Promise<string | undefined> {
    const normalized = this.normalizePhone(routePhone)
    if (!normalized) return undefined
    const binding = await this.phoneBindingService.findEnabledByPhone(normalized)
    return binding ? binding.phone : normalized
  }

  private firstConfigEntry(keys: string[]): { key: string; value: string } | null {
    for (const key of keys) {
      if (!key) continue
      const value = this.configService.get<string>(key, '')
      if (value) return { key, value }
    }
    return null
  }

  private parseSegment(value: unknown): CloudTranscriptionSegment | null {
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    const beginTime = this.getNumber(record.beginTime)
    const channelId = this.getNumber(record.channelId)
    const emotionValue = this.getNumber(record.emotionValue)
    const endTime = this.getNumber(record.endTime)
    const silenceDuration = this.getNumber(record.silenceDuration)
    const speechRate = this.getNumber(record.speechRate)
    const text = this.getText(record.text)

    if (
      beginTime === null ||
      channelId === null ||
      emotionValue === null ||
      endTime === null ||
      silenceDuration === null ||
      speechRate === null ||
      text === null
    ) {
      return null
    }

    return { beginTime, channelId, emotionValue, endTime, silenceDuration, speechRate, text }
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value)
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`
    }

    const record = value as Record<string, unknown>
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
    return `{${entries.join(',')}}`
  }

  private joinSortedFields(value: Record<string, unknown>): string {
    return Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${key}=${this.fieldValueToString(value[key])}`)
      .join('&')
  }

  private fieldValueToString(value: unknown): string {
    if (value === null) return ''
    if (typeof value === 'object') return this.stableStringify(value)
    return String(value)
  }

  private md5(value: string): string {
    return createHash('md5').update(value, 'utf8').digest('hex')
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
  }

  private logSignatureDiagnostics(
    taskId: string,
    query: CloudTranscriptionCallbackQueryDto,
    body: Record<string, unknown>,
    routePhone: string,
    credentialContext: CallbackCredentialContext,
    rawBodyText: string | undefined,
    result: SignatureValidationResult,
  ): void {
    const diagnosticMatches = result.diagnosticCandidates
      .filter((candidate) => this.safeEquals(candidate.signature, query.sign))
      .map((candidate) => candidate.label)
    const bodyKeys = Object.keys(body).join(',') || 'none'
    const firstSegmentKeys = this.firstSegmentKeys(body)
    const rawBodyFingerprint = rawBodyText
      ? `present:length=${rawBodyText.length}:sha256_12=${this.sha256(rawBodyText).slice(0, 12)}`
      : 'absent'

    this.logger.warn(
      [
        `Cloud transcription signature diagnostics: taskId=${taskId}`,
        `context=${credentialContext}`,
        `routePhone=${routePhone || 'account'}`,
        `reason=${result.reason}`,
        `credentialKeys=${result.credential ? `${result.credential.tokenKey}/${result.credential.saltKey}` : 'none'}`,
        `sign12=${this.shortSignature(query.sign)}`,
        `timestamp=${query.timestamp}`,
        `bodyKeys=${bodyKeys}`,
        `firstSegmentKeys=${firstSegmentKeys}`,
        `rawBody=${rawBodyFingerprint}`,
        `acceptedCandidates=${this.formatCandidates(result.candidates)}`,
        `diagnosticCandidates=${this.formatCandidates(result.diagnosticCandidates)}`,
        `diagnosticMatches=${diagnosticMatches.length ? diagnosticMatches.join(',') : 'none'}`,
      ].join('; '),
    )
  }

  private firstSegmentKeys(body: Record<string, unknown>): string {
    const result = body.result
    if (!Array.isArray(result) || !result[0] || typeof result[0] !== 'object') return 'none'
    return Object.keys(result[0] as Record<string, unknown>).join(',') || 'none'
  }

  private formatCandidates(candidates: SignatureCandidate[]): string {
    if (candidates.length === 0) return 'none'
    return candidates
      .map((candidate) => `${candidate.label}:${this.shortSignature(candidate.signature)}`)
      .join(',')
  }

  private shortSignature(value: string): string {
    return String(value ?? '').slice(0, 12)
  }

  private async saveCallbackEntity(
    callback: CloudTranscriptionCallback,
  ): Promise<CloudTranscriptionCallback> {
    try {
      return await this.callbackRepository.save(callback)
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error

      const existing = await this.callbackRepository.findOne({
        where: { taskId: callback.taskId },
      })
      if (!existing) throw error

      Object.assign(existing, {
        callSid: callback.callSid,
        statusCode: callback.statusCode,
        statusText: callback.statusText,
        bizDurationMs: callback.bizDurationMs,
        requestTime: callback.requestTime,
        solveTime: callback.solveTime,
        rawPayload: callback.rawPayload,
        transcriptText: callback.transcriptText,
        segments: callback.segments,
      })
      return this.callbackRepository.save(existing)
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const err = error as { code?: string; errno?: number; message?: string }
    return (
      err.code === 'ER_DUP_ENTRY' ||
      err.errno === 1062 ||
      String(err.message ?? '').includes('Duplicate entry')
    )
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left.toLowerCase(), 'utf8')
    const rightBuffer = Buffer.from(right.toLowerCase(), 'utf8')
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  }

  private getRequiredString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private getText(value: unknown): string | null {
    return typeof value === 'string' ? value : null
  }

  private getNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    if (!trimmed) return null
    const numberValue = Number(trimmed)
    return Number.isFinite(numberValue) ? numberValue : null
  }

  private getNumericStringOrNumber(value: unknown): string | number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    if (!trimmed) return null
    return Number.isFinite(Number(trimmed)) ? trimmed : null
  }

  private getBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return null
  }

  private normalizePhone(value: string | null | undefined): string {
    const digits = String(value ?? '').replace(/\D/g, '')
    if (digits.startsWith('0086') && digits.length === 15) return digits.slice(4)
    if (digits.startsWith('86') && digits.length === 13) return digits.slice(2)
    return digits
  }

  private isValidRoutePhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  private getTimestampToleranceMs(): number {
    return this.getNumberConfig(
      'CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS',
      15 * 60 * 1000,
    )
  }

  private getNumberConfig(key: string, fallback: number): number {
    const configured = this.configService.get<string | number>(key, fallback)
    const value = Number(configured)
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }

  private toFiniteNumber(value: string | number): number {
    return Number(value)
  }

  private toDate(value: string | number): Date {
    return new Date(this.toFiniteNumber(value))
  }

  private bizDurationSeconds(body: CloudTranscriptionCallbackBodyDto): number {
    const milliseconds = this.toFiniteNumber(body.bizDuration)
    return Number.isFinite(milliseconds) && milliseconds > 0 ? Math.round(milliseconds / 1000) : 0
  }

  private getRecordDurationSeconds(record: CallRecord): number | null {
    if (typeof record.duration === 'number' && record.duration > 0) return record.duration
    if (typeof record.estimatedDuration === 'number' && record.estimatedDuration > 0) {
      return record.estimatedDuration
    }
    return null
  }

  private speakerForChannel(channelId: number): TranscriptSpeaker {
    if (channelId === 0) return TranscriptSpeaker.AGENT
    if (channelId === 1) return TranscriptSpeaker.CUSTOMER
    return TranscriptSpeaker.UNKNOWN
  }

  private isSuccessfulStatus(body: CloudTranscriptionCallbackBodyDto): boolean {
    return (
      body.statusCode === CLOUD_TRANSCRIPTION_SUCCESS_CODE ||
      body.statusText.trim().toLowerCase() === 'success'
    )
  }

  private failure(message: string): CloudTranscriptionCallbackResponse {
    return { message, success: false, code: 0, data: false }
  }
}
