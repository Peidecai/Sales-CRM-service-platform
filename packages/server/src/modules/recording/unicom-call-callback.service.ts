import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Queue } from 'bull'
import { createHash, timingSafeEqual } from 'crypto'
import { In, Repository } from 'typeorm'
import {
  CallDirection,
  CallResult,
  CallStatus,
  CallType,
  RecordingSourceType,
  SimCarrier,
} from '@crm/shared'
import { CallRecord } from '../call-record/call-record.entity'
import { User } from '../user/user.entity'
import {
  UnicomCallCallback,
  UnicomCallCallbackKind,
  UnicomCallCallbackMatchStatus,
} from './entities/unicom-call-callback.entity'
import { RecordingFile } from './entities/recording-file.entity'
import { UnicomCallbackQueryDto, UnicomCallbackResponse } from './dto/unicom-callback.dto'
import { OssRecordingService } from './oss-recording.service'
import { UnicomPhoneBindingService } from './unicom-phone-binding.service'

interface UnicomCallPayload {
  accountName: string
  accountId: string
  callSid: string
  appName: string
  appId: string
  callerNo: string
  calledNo: string
  callType: string
  startTime: Date
  endTime: Date
  duration: number
  types: number
  callStartTime: Date | null
  orderId: string | null
  recv183: string | null
  displayNumber: string | null
  relatedCallSid: string | null
  sipCause: number | null
  sipCauseDesc: string | null
  isSuccess: number | null
  ringCause: string | null
  ringCauseDesc: string | null
  ringDuration: number | null
  recordUrl: string | null
  callerRecordUrl: string | null
  calledRecordUrl: string | null
  isDual: number | null
}

const UNICOM_RECORDING_TYPE = 4
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'amr'])

interface RouteUserLookup {
  user: User | null
  failureMessage?: string
  matchReason?: string
}

interface UnicomRecordingSource {
  url: string
  track: 'mixed' | 'caller' | 'called'
}

@Injectable()
export class UnicomCallCallbackService {
  private readonly logger = new Logger(UnicomCallCallbackService.name)

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UnicomCallCallback)
    private readonly callbackRepository: Repository<UnicomCallCallback>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RecordingFile)
    private readonly recordingFileRepository: Repository<RecordingFile>,
    private readonly ossRecording: OssRecordingService,
    private readonly phoneBindingService: UnicomPhoneBindingService,
    @InjectQueue('cloud-transcription-match')
    private readonly transcriptionMatchQueue: Queue<{ callRecordId: number }>,
  ) {}

  async handleCallback(
    routePhone: string | undefined,
    query: UnicomCallbackQueryDto,
    rawBody: Record<string, unknown>,
  ): Promise<UnicomCallbackResponse> {
    const normalizedRoutePhone = this.normalizePhone(routePhone)
    if (routePhone !== undefined && !this.isValidRoutePhone(normalizedRoutePhone)) {
      return this.failure('invalid route phone')
    }

    const callSidForLog = this.getRequiredString(rawBody.callSid) ?? 'unknown'
    if (!this.isValidSignature(query, rawBody, normalizedRoutePhone || undefined)) {
      this.logger.warn(
        `Rejected Unicom call callback: invalid signature, routePhone=${normalizedRoutePhone || 'account'}, callSid=${callSidForLog}`,
      )
      return this.failure('invalid sign')
    }

    const body = this.parsePayload(rawBody)
    if (!body) {
      this.logger.warn(
        `Rejected Unicom call callback: invalid body, routePhone=${normalizedRoutePhone}, callSid=${callSidForLog}`,
      )
      return this.failure('invalid body')
    }

    const resolvedRoutePhone = await this.resolveRoutePhone(normalizedRoutePhone, body)
    if (!resolvedRoutePhone) {
      this.logger.warn(
        `Rejected Unicom call callback: route phone not configured, callSid=${body.callSid}`,
      )
      return this.failure('route phone not configured')
    }

    if (!this.isValidRoutePhone(resolvedRoutePhone)) {
      return this.failure('invalid route phone')
    }

    const phoneMismatchReason = normalizedRoutePhone
      ? this.getRoutePhoneMismatchReason(resolvedRoutePhone, body)
      : null
    const callback = await this.saveCallbackPayload(resolvedRoutePhone, body, rawBody)
    if (phoneMismatchReason) {
      callback.matchStatus = UnicomCallCallbackMatchStatus.FAILED
      callback.matchReason = phoneMismatchReason
      await this.callbackRepository.save(callback)
      this.logger.warn(
        `Rejected Unicom call callback: ${phoneMismatchReason}, callSid=${body.callSid}, types=${body.types}`,
      )
      return this.failure('route phone does not match payload')
    }

    const result =
      body.types === UNICOM_RECORDING_TYPE
        ? await this.matchRecordingCallback(callback, resolvedRoutePhone, body)
        : await this.upsertCallRecord(callback, resolvedRoutePhone, body)

    this.logger.log(
      `Received Unicom call callback: routePhone=${resolvedRoutePhone}, callSid=${body.callSid}, types=${body.types}, match=${callback.matchStatus}, callRecordId=${callback.matchedCallRecordId ?? 'none'}`,
    )

    if (!result.accepted) return this.failure(result.message)
    return { message: 'success', success: true, code: 1, data: true }
  }

  parsePayload(raw: Record<string, unknown>): UnicomCallPayload | null {
    if (!raw || typeof raw !== 'object') return null

    const accountName = this.getRequiredString(raw.accountName)
    const accountId = this.getRequiredString(raw.accountId)
    const callSid = this.getRequiredString(raw.callSid)
    const appName = this.getRequiredString(raw.appName)
    const appId = this.getRequiredString(raw.appId)
    const callerNo = this.getRequiredString(raw.callerNo)
    const calledNo = this.getRequiredString(raw.calledNo)
    const callType = this.getRequiredString(raw.callType)
    const startTime = this.getDate(raw.startTime)
    const endTime = this.getDate(raw.endTime)
    const duration = this.getNumber(raw.duration)
    const types = this.getNumber(raw.types)

    if (
      accountName === null ||
      accountId === null ||
      callSid === null ||
      appName === null ||
      appId === null ||
      callerNo === null ||
      calledNo === null ||
      callType === null ||
      startTime === null ||
      endTime === null ||
      duration === null ||
      types === null
    ) {
      return null
    }

    return {
      accountName,
      accountId,
      callSid,
      appName,
      appId,
      callerNo,
      calledNo,
      callType,
      startTime,
      endTime,
      duration,
      types,
      callStartTime: this.getDate(raw.callStartTime),
      orderId: this.getOptionalString(raw.orderId),
      recv183: this.getOptionalString(raw.recv183),
      displayNumber: this.getOptionalString(raw.displayNumber),
      relatedCallSid: this.getOptionalString(raw.relatedCallSid),
      sipCause: this.getNumber(raw.sipCause),
      sipCauseDesc: this.getOptionalString(raw.sipCauseDesc),
      isSuccess: this.getNumber(raw.isSuccess),
      ringCause: this.getOptionalString(raw.ringCause),
      ringCauseDesc: this.getOptionalString(raw.ringCauseDesc),
      ringDuration: this.getNumber(raw.ringDuration),
      recordUrl: this.getOptionalString(raw.recordUrl),
      callerRecordUrl: this.getOptionalString(raw.callerRecordUrl),
      calledRecordUrl: this.getOptionalString(raw.calledRecordUrl),
      isDual: this.getNumber(raw.isDual),
    }
  }

  private async saveCallbackPayload(
    routePhone: string,
    body: UnicomCallPayload,
    rawBody: Record<string, unknown>,
  ): Promise<UnicomCallCallback> {
    const existing = await this.callbackRepository.findOne({
      where: { routePhone, callSid: body.callSid, types: body.types },
    })
    const callback =
      existing ??
      this.callbackRepository.create({
        routePhone,
        callSid: body.callSid,
        types: body.types,
        matchStatus: UnicomCallCallbackMatchStatus.PENDING,
      })

    callback.routePhone = routePhone
    callback.callSid = body.callSid
    callback.relatedCallSid = body.relatedCallSid
    callback.accountId = body.accountId
    callback.accountName = body.accountName
    callback.appId = body.appId
    callback.appName = body.appName
    callback.callerNo = body.callerNo
    callback.calledNo = body.calledNo
    callback.displayNumber = body.displayNumber
    callback.callTypeText = body.callType
    callback.startTime = body.startTime
    callback.endTime = body.endTime
    callback.callStartTime = body.callStartTime
    callback.duration = body.duration
    callback.types = body.types
    callback.isSuccess = body.isSuccess
    callback.isDual = body.isDual
    callback.recordUrl = body.recordUrl
    callback.callerRecordUrl = body.callerRecordUrl
    callback.calledRecordUrl = body.calledRecordUrl
    callback.ringCause = body.ringCause
    callback.ringCauseDesc = body.ringCauseDesc
    callback.ringDuration = body.ringDuration
    callback.sipCause = body.sipCause
    callback.sipCauseDesc = body.sipCauseDesc
    callback.orderId = body.orderId
    callback.recv183 = body.recv183
    callback.rawPayload = rawBody
    callback.callbackKind =
      body.types === UNICOM_RECORDING_TYPE
        ? UnicomCallCallbackKind.RECORDING
        : UnicomCallCallbackKind.CALL
    callback.matchedCallRecordId = existing?.matchedCallRecordId ?? null
    callback.matchStatus = existing?.matchStatus ?? UnicomCallCallbackMatchStatus.PENDING
    callback.matchReason = existing?.matchReason ?? null

    return this.saveCallbackEntity(callback)
  }

  private async resolveRoutePhone(
    routePhone: string,
    body: UnicomCallPayload,
  ): Promise<string | null> {
    if (routePhone) return routePhone

    const candidates = this.payloadRoutePhoneCandidates(body)
    for (const candidate of candidates) {
      const binding = await this.phoneBindingService.findEnabledByPhone(candidate)
      if (binding) return binding.phone
    }

    for (const candidate of candidates) {
      const variants = Array.from(new Set([candidate, `86${candidate}`, `+86${candidate}`]))
      const users = await this.userRepository.find({
        where: { phone: In(variants), isActive: true },
      })
      if (users.length === 1) return candidate
    }

    return candidates[0] ?? null
  }

  private payloadRoutePhoneCandidates(body: UnicomCallPayload): string[] {
    return Array.from(
      new Set(
        this.expectedRoutePhoneFields(body)
          .map(({ value }) => this.normalizePhone(value))
          .filter((value) => this.isValidRoutePhone(value)),
      ),
    )
  }

  private async upsertCallRecord(
    callback: UnicomCallCallback,
    routePhone: string,
    body: UnicomCallPayload,
  ): Promise<{ accepted: boolean; message: string }> {
    const routeUser = await this.findRouteUser(routePhone)
    if (!routeUser.user) {
      callback.matchStatus = UnicomCallCallbackMatchStatus.FAILED
      callback.matchReason =
        routeUser.matchReason ?? `no active user found for route phone ${routePhone}`
      await this.callbackRepository.save(callback)
      return {
        accepted: false,
        message: routeUser.failureMessage ?? 'route phone not configured',
      }
    }
    const user = routeUser.user

    const existing = await this.findUnicomCallRecord(body.callSid, routePhone)
    const record =
      existing ??
      this.callRecordRepository.create({
        providerCallId: body.callSid,
        customerId: null,
        opportunityId: null,
        userId: user.id,
        notes: null,
        aiSummary: null,
        isManualUpload: false,
      })

    const direction = this.directionFor(body, routePhone)
    const callAt = body.callStartTime ?? body.startTime
    const recordingUrl = this.primaryRecordingUrl(body)
    const endReason = this.endReasonFor(body)

    record.providerCallId = body.callSid
    record.userId = record.userId || user.id
    record.callAt = callAt
    record.duration = body.duration
    record.estimatedDuration = body.duration
    record.recordingUrl = recordingUrl ?? record.recordingUrl ?? null
    record.direction = direction
    record.callType = CallType.NORMAL
    record.status = CallStatus.ENDED
    record.answeredAt = body.isSuccess === 1 ? body.startTime : null
    record.endReason = endReason
    record.callResult = this.callResultFor(body)
    record.simNumber = routePhone
    record.simCarrier = SimCarrier.CHINA_UNICOM

    const saved = await this.saveCallRecordWithDuplicateRecovery(record, body.callSid, routePhone)
    callback.matchedCallRecordId = saved.id
    callback.matchStatus = UnicomCallCallbackMatchStatus.MATCHED
    callback.matchReason = existing
      ? 'matched existing call record by callSid'
      : 'created from Unicom call callback'
    await this.callbackRepository.save(callback)

    await this.applyPendingRecordingCallbacks(saved, routePhone, body.callSid)
    if (recordingUrl) {
      await this.upsertRecordingFiles(saved, body, routePhone)
    }
    await this.scheduleCloudTranscriptionMatch(saved.id)

    return { accepted: true, message: 'success' }
  }

  private async matchRecordingCallback(
    callback: UnicomCallCallback,
    routePhone: string,
    body: UnicomCallPayload,
  ): Promise<{ accepted: boolean; message: string }> {
    const record = await this.findMatchingCallRecord(body, routePhone)
    if (!record) {
      callback.matchStatus = UnicomCallCallbackMatchStatus.PENDING
      callback.matchReason = 'waiting for matching call detail callback'
      await this.callbackRepository.save(callback)
      return { accepted: true, message: 'success' }
    }

    await this.applyRecordingToRecord(
      record,
      callback,
      body,
      routePhone,
      'matched recording callback by callSid',
    )
    await this.scheduleCloudTranscriptionMatch(record.id)
    return { accepted: true, message: 'success' }
  }

  private async applyPendingRecordingCallbacks(
    record: CallRecord,
    routePhone: string,
    callSid: string,
  ): Promise<void> {
    const pendingCallbacks = await this.callbackRepository.find({
      where: [
        {
          routePhone,
          callSid,
          types: UNICOM_RECORDING_TYPE,
          matchStatus: UnicomCallCallbackMatchStatus.PENDING,
        },
        {
          routePhone,
          relatedCallSid: callSid,
          types: UNICOM_RECORDING_TYPE,
          matchStatus: UnicomCallCallbackMatchStatus.PENDING,
        },
      ],
    })

    for (const pending of pendingCallbacks) {
      const body = this.parsePayload(pending.rawPayload)
      if (body) {
        await this.applyRecordingToRecord(
          record,
          pending,
          body,
          routePhone,
          'matched after call detail callback',
        )
      }
    }
  }

  private async applyRecordingToRecord(
    record: CallRecord,
    callback: UnicomCallCallback,
    body: UnicomCallPayload,
    routePhone: string,
    reason: string,
  ): Promise<void> {
    const recordingUrl = this.primaryRecordingUrl(body)
    let changed = false

    if (recordingUrl && record.recordingUrl !== recordingUrl) {
      record.recordingUrl = recordingUrl
      changed = true
    }
    if ((!record.duration || record.duration <= 0) && body.duration > 0) {
      record.duration = body.duration
      record.estimatedDuration = body.duration
      changed = true
    }
    if (!record.providerCallId) {
      record.providerCallId = body.callSid
      changed = true
    }

    if (changed) {
      await this.saveCallRecordWithDuplicateRecovery(record, body.callSid, routePhone)
    }

    if (recordingUrl) {
      await this.upsertRecordingFiles(record, body, routePhone)
    }

    callback.matchedCallRecordId = record.id
    callback.matchStatus = UnicomCallCallbackMatchStatus.MATCHED
    callback.matchReason = reason
    await this.callbackRepository.save(callback)
  }

  private async findMatchingCallRecord(
    body: UnicomCallPayload,
    routePhone: string,
  ): Promise<CallRecord | null> {
    const byCallSid = await this.findUnicomCallRecord(body.callSid, routePhone)
    if (byCallSid) return byCallSid

    if (!body.relatedCallSid) return null
    return this.findUnicomCallRecord(body.relatedCallSid, routePhone)
  }

  private async findUnicomCallRecord(
    providerCallId: string,
    routePhone: string,
  ): Promise<CallRecord | null> {
    return this.callRecordRepository.findOne({
      where: {
        providerCallId,
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      },
    })
  }

  private async saveCallRecordWithDuplicateRecovery(
    record: CallRecord,
    providerCallId: string,
    routePhone: string,
  ): Promise<CallRecord> {
    try {
      return await this.callRecordRepository.save(record)
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error
      const existing = await this.findUnicomCallRecord(providerCallId, routePhone)
      if (existing) return existing
      throw error
    }
  }

  private async upsertRecordingFiles(
    record: CallRecord,
    body: UnicomCallPayload,
    routePhone: string,
  ): Promise<void> {
    const sources = this.recordingSources(body)
    for (const source of sources) {
      const ossKey = this.unicomRecordingOssKey(routePhone, body.callSid, source)
      const existing = await this.recordingFileRepository.findOne({ where: { ossKey } })
      const recordingFile = existing ?? this.recordingFileRepository.create({ ossKey })

      recordingFile.callRecordId = record.id
      recordingFile.fileName = this.unicomRecordingFileName(body.callSid, source)
      recordingFile.ossKey = ossKey
      recordingFile.ossBucket = this.ossRecording.getBucket()
      recordingFile.fileSize = recordingFile.fileSize ?? null
      recordingFile.durationSeconds = body.duration > 0 ? body.duration : null
      recordingFile.mimeType = this.mimeTypeForUrl(source.url)
      recordingFile.sourceType = RecordingSourceType.PLATFORM
      recordingFile.counterpartPhone = this.counterpartPhoneFor(body, routePhone)
      recordingFile.actualCallTime = body.callStartTime ?? body.startTime
      recordingFile.uploadedById = record.userId
      recordingFile.notes = `Unicom recording callback (${source.track})`

      if (!existing) {
        try {
          await this.ossRecording.uploadFromUrl(source.url, ossKey)
        } catch (error) {
          this.logger.warn(
            `Failed to mirror Unicom recording to OSS, callSid=${body.callSid}, track=${source.track}: ${String(error)}`,
          )
          continue
        }
      }

      await this.saveRecordingFileWithDuplicateRecovery(recordingFile, ossKey)
    }
  }

  private async saveRecordingFileWithDuplicateRecovery(
    recordingFile: RecordingFile,
    ossKey: string,
  ): Promise<RecordingFile> {
    try {
      return await this.recordingFileRepository.save(recordingFile)
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error
      const existing = await this.recordingFileRepository.findOne({ where: { ossKey } })
      if (!existing) throw error
      Object.assign(existing, {
        callRecordId: recordingFile.callRecordId,
        fileName: recordingFile.fileName,
        ossBucket: recordingFile.ossBucket,
        fileSize: recordingFile.fileSize,
        durationSeconds: recordingFile.durationSeconds,
        mimeType: recordingFile.mimeType,
        sourceType: recordingFile.sourceType,
        counterpartPhone: recordingFile.counterpartPhone,
        actualCallTime: recordingFile.actualCallTime,
        uploadedById: recordingFile.uploadedById,
        notes: recordingFile.notes,
      })
      return this.recordingFileRepository.save(existing)
    }
  }

  private recordingSources(body: UnicomCallPayload): UnicomRecordingSource[] {
    const sources: UnicomRecordingSource[] = []
    if (body.recordUrl) sources.push({ track: 'mixed', url: body.recordUrl })
    if (body.callerRecordUrl) sources.push({ track: 'caller', url: body.callerRecordUrl })
    if (body.calledRecordUrl) sources.push({ track: 'called', url: body.calledRecordUrl })

    const seen = new Set<string>()
    return sources.filter((source) => {
      if (seen.has(source.url)) return false
      seen.add(source.url)
      return true
    })
  }

  private unicomRecordingOssKey(
    routePhone: string,
    callSid: string,
    source: UnicomRecordingSource,
  ): string {
    const extension = this.extensionForUrl(source.url)
    return `unicom-recordings/${routePhone}/${callSid}/${source.track}.${extension}`
  }

  private unicomRecordingFileName(callSid: string, source: UnicomRecordingSource): string {
    return `${callSid}-${source.track}.${this.extensionForUrl(source.url)}`
  }

  private extensionForUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname
      const match = pathname.match(/\.([a-z0-9]+)$/i)
      const extension = match?.[1]?.toLowerCase()
      return extension && AUDIO_EXTENSIONS.has(extension) ? extension : 'mp3'
    } catch {
      return 'mp3'
    }
  }

  private mimeTypeForUrl(url: string): string {
    const extension = this.extensionForUrl(url)
    if (extension === 'wav') return 'audio/wav'
    if (extension === 'm4a') return 'audio/mp4'
    if (extension === 'aac') return 'audio/aac'
    if (extension === 'ogg') return 'audio/ogg'
    if (extension === 'flac') return 'audio/flac'
    if (extension === 'amr') return 'audio/amr'
    return 'audio/mpeg'
  }

  private async findRouteUser(routePhone: string): Promise<RouteUserLookup> {
    const binding = await this.phoneBindingService.findEnabledByPhone(routePhone)
    if (binding) {
      if (!binding.user || !binding.user.isActive) {
        return {
          user: null,
          failureMessage: 'route phone bound user is inactive',
          matchReason: `bound user ${binding.userId} is inactive for route phone ${routePhone}`,
        }
      }
      return { user: binding.user }
    }

    const variants = Array.from(new Set([routePhone, `86${routePhone}`, `+86${routePhone}`]))
    const users = await this.userRepository.find({
      where: { phone: In(variants), isActive: true },
    })
    if (users.length === 0) {
      return {
        user: null,
        failureMessage: 'route phone not configured',
        matchReason: `no active user found for route phone ${routePhone}`,
      }
    }
    if (users.length > 1) {
      return {
        user: null,
        failureMessage: 'route phone has multiple active users',
        matchReason: `multiple active users found for route phone ${routePhone}: ${users
          .map((user) => user.id)
          .join(',')}`,
      }
    }
    return { user: users[0] }
  }

  private isValidSignature(
    query: UnicomCallbackQueryDto,
    body: Record<string, unknown>,
    routePhone?: string,
  ): boolean {
    const credential = this.resolveCredential(routePhone)
    if (!credential || query.token !== credential.token) return false

    const timestamp = Number(query.timestamp)
    const toleranceMs = this.getNumberConfig(
      'UNICOM_CALLBACK_TIMESTAMP_TOLERANCE_MS',
      15 * 60 * 1000,
    )
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > toleranceMs) {
      return false
    }

    const timestampValues: Array<string | number> = [query.timestamp]
    if (String(timestamp) === query.timestamp) timestampValues.push(timestamp)

    const candidates = new Set<string>()
    for (const timestampValue of timestampValues) {
      const signedPayload = { ...body, timestamp: timestampValue, token: query.token }
      for (const str of [
        this.stableStringify(signedPayload),
        this.joinSortedFields(signedPayload),
      ]) {
        const first = this.md5(`${str}${credential.salt}`)
        candidates.add(first)
        candidates.add(this.md5(first))
      }
    }

    return Array.from(candidates).some((candidate) => this.safeEquals(candidate, query.sign))
  }

  private resolveCredential(routePhone?: string): { token: string; salt: string } | null {
    const suffix = this.normalizePhone(routePhone)
    const token = this.firstConfigValue([
      suffix ? `UNICOM_CALLBACK_TOKEN_${suffix}` : '',
      suffix ? `UNICOM_CALL_CALLBACK_TOKEN_${suffix}` : '',
      'UNICOM_CALLBACK_TOKEN',
      'UNICOM_CALL_CALLBACK_TOKEN',
    ])
    const salt = this.firstConfigValue([
      suffix ? `UNICOM_CALLBACK_SALT_${suffix}` : '',
      suffix ? `UNICOM_CALL_CALLBACK_SALT_${suffix}` : '',
      'UNICOM_CALLBACK_SALT',
      'UNICOM_CALL_CALLBACK_SALT',
    ])

    return token && salt ? { token, salt } : null
  }

  private firstConfigValue(keys: string[]): string {
    for (const key of keys) {
      if (!key) continue
      const value = this.configService.get<string>(key, '')
      if (value) return value
    }
    return ''
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

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left.toLowerCase(), 'utf8')
    const rightBuffer = Buffer.from(right.toLowerCase(), 'utf8')
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  }

  private async saveCallbackEntity(callback: UnicomCallCallback): Promise<UnicomCallCallback> {
    try {
      return await this.callbackRepository.save(callback)
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error

      const existing = await this.callbackRepository.findOne({
        where: {
          routePhone: callback.routePhone,
          callSid: callback.callSid,
          types: callback.types,
        },
      })
      if (!existing) throw error

      Object.assign(existing, callback, { id: existing.id })
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

  private getRoutePhoneMismatchReason(routePhone: string, body: UnicomCallPayload): string | null {
    const expectedFields = this.expectedRoutePhoneFields(body)
    const normalizedFields = expectedFields.map(({ field, value }) => ({
      field,
      value: this.normalizePhone(value),
    }))

    if (normalizedFields.some((item) => item.value === routePhone)) return null

    const payloadPhones = normalizedFields
      .filter((item) => item.value)
      .map((item) => `${item.field}=${item.value}`)
      .join(',')
    return `route phone ${routePhone} does not match payload ${payloadPhones || 'phone fields'}`
  }

  private expectedRoutePhoneFields(
    body: UnicomCallPayload,
  ): Array<{ field: string; value: string | null }> {
    const displayNumber = { field: 'displayNumber', value: body.displayNumber }
    if (this.isInbound(body)) {
      return [{ field: 'calledNo', value: body.calledNo }, displayNumber]
    }
    if (this.isOutbound(body)) {
      return [{ field: 'callerNo', value: body.callerNo }, displayNumber]
    }
    return [
      { field: 'callerNo', value: body.callerNo },
      { field: 'calledNo', value: body.calledNo },
      displayNumber,
    ]
  }

  private directionFor(body: UnicomCallPayload, routePhone: string): CallDirection {
    if (this.isInbound(body)) return CallDirection.INBOUND
    if (this.isOutbound(body)) return CallDirection.OUTBOUND

    const caller = this.normalizePhone(body.callerNo)
    const called = this.normalizePhone(body.calledNo)
    if (called === routePhone && caller !== routePhone) return CallDirection.INBOUND
    return CallDirection.OUTBOUND
  }

  private isInbound(body: UnicomCallPayload): boolean {
    return body.callType.includes('呼入')
  }

  private isOutbound(body: UnicomCallPayload): boolean {
    return body.callType.includes('呼出')
  }

  private callResultFor(body: UnicomCallPayload): CallResult | null {
    if (body.isSuccess === 1) return CallResult.CONNECTED
    if (body.ringCause === '770') return CallResult.POWER_OFF
    if (['773', '780'].includes(body.ringCause ?? '')) return CallResult.BUSY
    if (['769', '775', '789'].includes(body.ringCause ?? '')) return CallResult.NO_ANSWER
    return body.isSuccess === 0 ? CallResult.NO_ANSWER : null
  }

  private endReasonFor(body: UnicomCallPayload): string | null {
    return body.ringCauseDesc ?? body.sipCauseDesc ?? body.ringCause ?? null
  }

  private primaryRecordingUrl(body: UnicomCallPayload): string | null {
    return body.recordUrl ?? body.callerRecordUrl ?? body.calledRecordUrl
  }

  private counterpartPhoneFor(body: UnicomCallPayload, routePhone: string): string | null {
    const caller = this.normalizePhone(body.callerNo)
    const called = this.normalizePhone(body.calledNo)
    if (caller === routePhone && called) return called
    if (called === routePhone && caller) return caller
    return caller && caller !== routePhone
      ? caller
      : called && called !== routePhone
        ? called
        : null
  }

  private getRequiredString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private getOptionalString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private getNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const numberValue = Number(trimmed)
    return Number.isFinite(numberValue) ? numberValue : null
  }

  private getDate(value: unknown): Date | null {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null
    if (typeof value === 'number') {
      const date = new Date(value)
      return Number.isFinite(date.getTime()) ? date : null
    }
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    if (!trimmed) return null
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/)
    if (match) {
      const [, year, month, day, hour, minute, second] = match
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      )
      return Number.isFinite(date.getTime()) ? date : null
    }

    const fallback = new Date(trimmed)
    return Number.isFinite(fallback.getTime()) ? fallback : null
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

  private getNumberConfig(key: string, fallback: number): number {
    const configured = this.configService.get<string | number>(key, fallback)
    const value = Number(configured)
    return Number.isFinite(value) && value >= 0 ? value : fallback
  }

  private async scheduleCloudTranscriptionMatch(callRecordId: number): Promise<void> {
    try {
      await this.transcriptionMatchQueue.add(
        { callRecordId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
          jobId: `unicom-call-match:${callRecordId}`,
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      )
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue Unicom transcription match for call record #${callRecordId}: ${String(error)}`,
      )
    }
  }

  private failure(message: string): UnicomCallbackResponse {
    return { message, success: false, code: 0, data: false }
  }
}
