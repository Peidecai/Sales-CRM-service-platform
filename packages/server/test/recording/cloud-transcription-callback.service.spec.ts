import { createHash } from 'crypto'
import { CloudTranscriptionCallbackService } from '../../src/modules/recording/cloud-transcription-callback.service'
import {
  CloudTranscriptionCallback,
  CloudTranscriptionMatchStatus,
} from '../../src/modules/recording/entities/cloud-transcription-callback.entity'
import { RecordingFile } from '../../src/modules/recording/entities/recording-file.entity'
import { AsrTask, AsrTaskStatus } from '../../src/modules/recording/entities/asr-task.entity'
import { CallTranscript } from '../../src/modules/recording/entities/call-transcript.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import type {
  CloudTranscriptionCallbackBodyDto,
  CloudTranscriptionCallbackQueryDto,
} from '../../src/modules/recording/dto/cloud-transcription-callback.dto'
import { CallType } from '@crm/shared'
import {
  createMockConfigService,
  createMockQueryBuilder,
  createMockRepository,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('CloudTranscriptionCallbackService', () => {
  let service: CloudTranscriptionCallbackService
  let callbackRepo: MockRepository<CloudTranscriptionCallback>
  let callRecordRepo: MockRepository<CallRecord>
  let recordingFileRepo: MockRepository<RecordingFile>
  let asrTaskRepo: MockRepository<AsrTask>
  let transcriptRepo: MockRepository<CallTranscript>
  let callSummaryQueue: { add: jest.Mock }
  let transcriptionMatchQueue: { add: jest.Mock }
  let phoneBindingService: { findEnabledByPhone: jest.Mock }
  let now: number

  const token = 'test-token'
  const salt = 'test-salt'

  const body: CloudTranscriptionCallbackBodyDto = {
    bizDuration: 11072,
    enableCallback: true,
    requestTime: 1714440000000,
    result: [
      {
        beginTime: 0,
        channelId: 0,
        emotionValue: 6,
        endTime: 1000,
        silenceDuration: 0,
        speechRate: 120,
        text: 'hello',
      },
      {
        beginTime: 1000,
        channelId: 1,
        emotionValue: 5,
        endTime: 2200,
        silenceDuration: 0,
        speechRate: 110,
        text: 'world',
      },
    ],
    solveTime: 1714440003000,
    statusCode: 21050000,
    statusText: 'SUCCESS',
    taskId: 'task-1',
    callSid: 'call-1',
  }

  beforeEach(() => {
    now = Date.now()
    callbackRepo = createMockRepository<CloudTranscriptionCallback>()
    callRecordRepo = createMockRepository<CallRecord>()
    recordingFileRepo = createMockRepository<RecordingFile>()
    asrTaskRepo = createMockRepository<AsrTask>()
    transcriptRepo = createMockRepository<CallTranscript>()
    callSummaryQueue = { add: jest.fn().mockResolvedValue({ id: 'summary-job-1' }) }
    transcriptionMatchQueue = { add: jest.fn().mockResolvedValue({ id: 'match-job-1' }) }
    phoneBindingService = { findEnabledByPhone: jest.fn().mockResolvedValue(null) }

    callbackRepo.findOne.mockResolvedValue(null)
    callbackRepo.create.mockImplementation((payload) => ({
      id: 50,
      ...payload,
    }))
    callbackRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 50,
      ...record,
    }))

    callRecordRepo.findOne.mockResolvedValue(null)
    callRecordRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([], 0))
    callRecordRepo.save.mockImplementation(async (record) => record)

    recordingFileRepo.findOne.mockResolvedValue(null)
    recordingFileRepo.create.mockImplementation((payload) => ({
      id: 60,
      ...payload,
    }))
    recordingFileRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 60,
      ...record,
    }))

    asrTaskRepo.findOne.mockResolvedValue(null)
    asrTaskRepo.create.mockImplementation((payload) => ({
      id: 70,
      ...payload,
    }))
    asrTaskRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 70,
      ...record,
    }))

    transcriptRepo.create.mockImplementation((payload) => payload)
    transcriptRepo.save.mockImplementation(async (records) => records)
    transcriptRepo.delete.mockResolvedValue({ affected: 0 })

    service = new CloudTranscriptionCallbackService(
      createMockConfigService({
        CLOUD_TRANSCRIPTION_CALLBACK_TOKEN: token,
        CLOUD_TRANSCRIPTION_CALLBACK_SALT: salt,
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )
  })

  it('should store a valid signed callback as pending when no local outbound record matches', async () => {
    const callbackBody = { ...body, callSid: 'orphan-call' }

    const result = await service.handleCallback(signedQuery(callbackBody), asRawBody(callbackBody))

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        taskId: 'task-1',
        callSid: 'orphan-call',
        matchStatus: CloudTranscriptionMatchStatus.PENDING,
        matchedCallRecordId: null,
      }),
    )
    expect(recordingFileRepo.save).not.toHaveBeenCalled()
    expect(callSummaryQueue.add).not.toHaveBeenCalled()
    expect(transcriptionMatchQueue.add).toHaveBeenCalledWith(
      { taskId: 'task-1' },
      expect.objectContaining({ jobId: 'cloud-transcription-match:task-1' }),
    )
  })

  it('should handle duplicate task inserts as idempotent callback retries', async () => {
    const existingCallback = {
      id: 50,
      taskId: body.taskId,
      callSid: body.callSid,
      statusCode: body.statusCode,
      statusText: body.statusText,
      bizDurationMs: Number(body.bizDuration),
      requestTime: new Date(Number(body.requestTime)),
      solveTime: new Date(Number(body.solveTime)),
      rawPayload: asRawBody(body),
      transcriptText: 'hello\nworld',
      segments: body.result,
      matchedCallRecordId: null,
      matchStatus: CloudTranscriptionMatchStatus.PENDING,
      matchReason: null,
    } as CloudTranscriptionCallback
    callbackRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existingCallback)
    callbackRepo.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' })

    const result = await service.handleCallback(signedQuery(body), asRawBody(body))

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        taskId: body.taskId,
        matchStatus: CloudTranscriptionMatchStatus.PENDING,
      }),
    )
  })

  it('should parse the callback payload into the documented structure', () => {
    expect(service.parseCallbackBody(asRawBody(body))).toEqual(body)
  })

  it('should accept sorted key-value signature format from the push document', async () => {
    const result = await service.handleCallback(signedQueryWithSortedFields(body), asRawBody(body))

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should accept Unicom transcription JSON signatures that sign timestamp as a number', async () => {
    const unicomService = new CloudTranscriptionCallbackService(
      createMockConfigService({
        UNICOM_CALLBACK_TOKEN: token,
        UNICOM_CALLBACK_SALT: salt,
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )
    const timestamp = String(now)
    const signedPayload = { ...asRawBody(body), timestamp: now, token }
    const sign = md5(`${stableStringify(signedPayload)}${salt}`)

    const result = await unicomService.handleCallback(
      { token, timestamp, sign },
      asRawBody(body),
      undefined,
      'unicom',
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should accept Unicom transcription JSON signatures that preserve payload key order', async () => {
    const unicomService = new CloudTranscriptionCallbackService(
      createMockConfigService({
        UNICOM_CALLBACK_TOKEN: token,
        UNICOM_CALLBACK_SALT: salt,
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )
    const timestamp = String(now)
    const signedPayload = { ...asRawBody(body), timestamp, token }
    const sign = md5(`${JSON.stringify(signedPayload)}${salt}`)

    const result = await unicomService.handleCallback(
      { token, timestamp, sign },
      asRawBody(body),
      undefined,
      'unicom',
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should accept real Unicom transcription signatures using body JSON plus token and timestamp', async () => {
    const unicomService = new CloudTranscriptionCallbackService(
      createMockConfigService({
        UNICOM_CALLBACK_TOKEN: token,
        UNICOM_CALLBACK_SALT: salt,
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )
    const timestamp = String(now)
    const rawBody = asRawBody(body)
    const rawBodyText = JSON.stringify(rawBody)
    const sign = md5(`${rawBodyText}${token}${timestamp}${salt}`)

    const result = await unicomService.handleCallback(
      { token, timestamp, sign },
      rawBody,
      undefined,
      'unicom',
      rawBodyText,
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should accept phone-specific Unicom transcription callback credentials', async () => {
    const phoneSpecificService = new CloudTranscriptionCallbackService(
      createMockConfigService({
        UNICOM_TRANSCRIPTION_CALLBACK_TOKEN_13800138000: 'phone-token',
        UNICOM_TRANSCRIPTION_CALLBACK_SALT_13800138000: 'phone-salt',
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )

    const timestamp = String(now)
    const signedPayload = { ...asRawBody(body), timestamp, token: 'phone-token' }
    const first = md5(`${stableStringify(signedPayload)}phone-salt`)
    const result = await phoneSpecificService.handleCallback(
      { token: 'phone-token', timestamp, sign: md5(first) },
      asRawBody(body),
      '13800138000',
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should prefer Unicom global credentials for account-level Unicom transcription callbacks', async () => {
    const unicomService = new CloudTranscriptionCallbackService(
      createMockConfigService({
        CLOUD_TRANSCRIPTION_CALLBACK_TOKEN: 'cloud-token',
        CLOUD_TRANSCRIPTION_CALLBACK_SALT: 'cloud-salt',
        UNICOM_CALLBACK_TOKEN: 'unicom-token',
        UNICOM_CALLBACK_SALT: 'unicom-salt',
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )

    const timestamp = String(now)
    const signedPayload = { ...asRawBody(body), timestamp, token: 'unicom-token' }
    const first = md5(`${stableStringify(signedPayload)}unicom-salt`)
    const result = await unicomService.handleCallback(
      { token: 'unicom-token', timestamp, sign: md5(first) },
      asRawBody(body),
      undefined,
      'unicom',
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should prefer account-level Unicom credentials over stale legacy transcription credentials', async () => {
    const accountToken = 'account-unicom-token'
    const accountSalt = 'account-unicom-salt'
    const unicomService = new CloudTranscriptionCallbackService(
      createMockConfigService({
        UNICOM_CALLBACK_TOKEN: accountToken,
        UNICOM_CALLBACK_SALT: accountSalt,
        UNICOM_TRANSCRIPTION_CALLBACK_TOKEN: 'stale-transcription-token',
        UNICOM_TRANSCRIPTION_CALLBACK_SALT: 'stale-transcription-salt',
        CLOUD_TRANSCRIPTION_CALLBACK_TOKEN: 'cloud-token',
        CLOUD_TRANSCRIPTION_CALLBACK_SALT: 'cloud-salt',
        CLOUD_TRANSCRIPTION_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_WINDOW_MS: 10 * 60 * 1000,
        CLOUD_TRANSCRIPTION_MATCH_DURATION_TOLERANCE_SECONDS: 120,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      recordingFileRepo as never,
      asrTaskRepo as never,
      transcriptRepo as never,
      callSummaryQueue as never,
      transcriptionMatchQueue as never,
      phoneBindingService as never,
    )

    const timestamp = String(now)
    const signedPayload = { ...asRawBody(body), timestamp, token: accountToken }
    const first = md5(`${stableStringify(signedPayload)}${accountSalt}`)
    const result = await unicomService.handleCallback(
      { token: accountToken, timestamp, sign: md5(first) },
      asRawBody(body),
      undefined,
      'unicom',
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
  })

  it('should match by provider callSid and persist transcripts then queue AI analysis', async () => {
    const record = fixtures.callRecord({
      id: 8,
      providerCallId: body.callSid,
      duration: 0,
      estimatedDuration: null,
      callType: CallType.MANUAL,
    }) as CallRecord
    callRecordRepo.findOne.mockResolvedValue(record)

    const result = await service.handleCallback(signedQuery(body), asRawBody(body))

    expect(result.success).toBe(true)
    expect(record.duration).toBe(11)
    expect(recordingFileRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        callRecordId: 8,
        ossKey: 'cloud-transcription/call-1/task-1.json',
      }),
    )
    expect(asrTaskRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        externalTaskId: 'task-1',
        status: AsrTaskStatus.COMPLETED,
      }),
    )
    expect(transcriptRepo.delete).toHaveBeenCalledWith({ asrTaskId: 70 })
    expect(transcriptRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ asrTaskId: 70, segmentIndex: 0, text: 'hello' }),
        expect.objectContaining({ asrTaskId: 70, segmentIndex: 1, text: 'world' }),
      ]),
    )
    expect(callSummaryQueue.add).toHaveBeenCalledWith(
      { callRecordId: 8 },
      expect.objectContaining({ jobId: 'cloud-transcription:task-1:8' }),
    )
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 8,
        matchStatus: CloudTranscriptionMatchStatus.MATCHED,
      }),
    )
  })

  it('should bind a unique fuzzy match and set providerCallId on the local record', async () => {
    const record = fixtures.callRecord({
      id: 9,
      providerCallId: null,
      callAt: new Date(Number(body.requestTime)),
      duration: 11,
      estimatedDuration: 11,
      callType: CallType.MANUAL,
    }) as CallRecord
    callRecordRepo.findOne.mockResolvedValue(null)
    callRecordRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([record], 1))

    await service.handleCallback(signedQuery(body), asRawBody(body))

    expect(record.providerCallId).toBe(body.callSid)
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        providerCallId: body.callSid,
      }),
    )
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 9,
        matchStatus: CloudTranscriptionMatchStatus.MATCHED,
        matchReason: 'matched by local native outbound metadata',
      }),
    )
  })

  it('should retry a pending callback and bind it when the local outbound record appears later', async () => {
    const pendingCallback = {
      id: 50,
      taskId: body.taskId,
      callSid: body.callSid,
      statusCode: body.statusCode,
      statusText: body.statusText,
      bizDurationMs: Number(body.bizDuration),
      requestTime: new Date(Number(body.requestTime)),
      solveTime: new Date(Number(body.solveTime)),
      rawPayload: asRawBody(body),
      transcriptText: 'hello\nworld',
      segments: body.result,
      matchedCallRecordId: null,
      matchStatus: CloudTranscriptionMatchStatus.PENDING,
      matchReason: null,
    } as CloudTranscriptionCallback
    const record = fixtures.callRecord({
      id: 15,
      providerCallId: null,
      callAt: new Date(Number(body.requestTime)),
      duration: 11,
      estimatedDuration: 11,
      callType: CallType.MANUAL,
    }) as CallRecord
    callbackRepo.findOne.mockResolvedValue(pendingCallback)
    callRecordRepo.findOne.mockResolvedValue(null)
    callRecordRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([record], 1))

    await service.handlePendingMatchRetry({ data: { taskId: body.taskId } } as never)

    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 15,
        matchStatus: CloudTranscriptionMatchStatus.MATCHED,
      }),
    )
    expect(callSummaryQueue.add).toHaveBeenCalledWith(
      { callRecordId: 15 },
      expect.objectContaining({ jobId: 'cloud-transcription:task-1:15' }),
    )
  })

  it('should scan recent pending callbacks when a native outbound record is created', async () => {
    const pendingCallback = {
      id: 51,
      taskId: body.taskId,
      callSid: body.callSid,
      statusCode: body.statusCode,
      statusText: body.statusText,
      bizDurationMs: Number(body.bizDuration),
      requestTime: new Date(Number(body.requestTime)),
      solveTime: new Date(Number(body.solveTime)),
      rawPayload: asRawBody(body),
      transcriptText: 'hello\nworld',
      segments: body.result,
      matchedCallRecordId: null,
      matchStatus: CloudTranscriptionMatchStatus.PENDING,
      matchReason: null,
      createdAt: new Date(),
    } as CloudTranscriptionCallback
    const record = fixtures.callRecord({
      id: 16,
      providerCallId: null,
      callAt: new Date(Number(body.requestTime)),
      duration: 11,
      estimatedDuration: 11,
      callType: CallType.MANUAL,
    }) as CallRecord

    callRecordRepo.findOne.mockResolvedValueOnce(record).mockResolvedValue(null)
    callbackRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([pendingCallback], 1))
    callbackRepo.findOne.mockResolvedValue(pendingCallback)
    callRecordRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([record], 1))

    await service.handlePendingMatchRetry({ data: { callRecordId: 16 } } as never)

    expect(callbackRepo.createQueryBuilder).toHaveBeenCalled()
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 16,
        matchStatus: CloudTranscriptionMatchStatus.MATCHED,
      }),
    )
  })

  it('should mark ambiguous when multiple local outbound candidates match', async () => {
    const candidates = [
      fixtures.callRecord({
        id: 11,
        providerCallId: null,
        callAt: new Date(Number(body.requestTime)),
        duration: 11,
        callType: CallType.MANUAL,
      }) as CallRecord,
      fixtures.callRecord({
        id: 12,
        providerCallId: null,
        callAt: new Date(Number(body.requestTime) + 1000),
        duration: 11,
        callType: CallType.MANUAL,
      }) as CallRecord,
    ]
    callRecordRepo.findOne.mockResolvedValue(null)
    callRecordRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(candidates, 2))

    await service.handleCallback(signedQuery(body), asRawBody(body))

    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: null,
        matchStatus: CloudTranscriptionMatchStatus.AMBIGUOUS,
      }),
    )
    expect(recordingFileRepo.save).not.toHaveBeenCalled()
    expect(callSummaryQueue.add).not.toHaveBeenCalled()
    expect(transcriptionMatchQueue.add).not.toHaveBeenCalled()
  })

  it('should reject invalid signatures without writing callback data', async () => {
    const warnSpy = jest
      .spyOn((service as unknown as { logger: { warn: (message: string) => void } }).logger, 'warn')
      .mockImplementation()
    const rawBodyText = JSON.stringify(asRawBody(body))

    const result = await service.handleCallback(
      { token, timestamp: String(now), sign: 'bad' },
      asRawBody(body),
      undefined,
      'cloud',
      rawBodyText,
    )

    expect(result).toEqual({ message: 'invalid sign', success: false, code: 0, data: false })
    expect(callbackRepo.save).not.toHaveBeenCalled()

    const diagnosticMessage = warnSpy.mock.calls
      .map(([message]) => String(message))
      .find((message) => message.includes('Cloud transcription signature diagnostics'))
    expect(diagnosticMessage).toBeDefined()
    expect(diagnosticMessage).toContain('reason=candidate mismatch')
    expect(diagnosticMessage).toContain('bodyKeys=bizDuration,enableCallback,requestTime')
    expect(diagnosticMessage).toContain('rawBody=present:length=')
    expect(diagnosticMessage).toContain('acceptedCandidates=object-json-ts-string:md5:')
    expect(diagnosticMessage).toContain('diagnosticCandidates=body-json-only:md5:')
    expect(diagnosticMessage).not.toContain(token)
    expect(diagnosticMessage).not.toContain(salt)
    expect(diagnosticMessage).not.toContain('hello')
    expect(diagnosticMessage).not.toContain('world')

    warnSpy.mockRestore()
  })

  it('should reject malformed Unicom route phones before global credential fallback', async () => {
    const result = await service.handleCallback(
      signedQuery(body),
      asRawBody(body),
      '138',
    )

    expect(result).toEqual({
      message: 'invalid route phone',
      success: false,
      code: 0,
      data: false,
    })
    expect(phoneBindingService.findEnabledByPhone).not.toHaveBeenCalled()
    expect(callbackRepo.save).not.toHaveBeenCalled()
  })

  it('should reject signed callbacks with malformed result segments without writing callback data', async () => {
    const malformedBody = {
      ...body,
      result: [{ ...body.result[0], beginTime: 'not-a-number' }],
    }

    const result = await service.handleCallback(
      signedQuery(malformedBody),
      malformedBody as Record<string, unknown>,
    )

    expect(result).toEqual({ message: 'invalid body', success: false, code: 0, data: false })
    expect(callbackRepo.save).not.toHaveBeenCalled()
  })

  it('should reject signed callbacks with boolean number fields', async () => {
    const malformedBody = {
      ...body,
      statusCode: true,
    }

    const result = await service.handleCallback(
      signedQuery(malformedBody),
      malformedBody as Record<string, unknown>,
    )

    expect(result).toEqual({ message: 'invalid body', success: false, code: 0, data: false })
  })

  it('should reject signed callbacks with empty numeric segment fields', async () => {
    const malformedBody = {
      ...body,
      result: [{ ...body.result[0], beginTime: '' }],
    }

    const result = await service.handleCallback(
      signedQuery(malformedBody),
      malformedBody as Record<string, unknown>,
    )

    expect(result).toEqual({ message: 'invalid body', success: false, code: 0, data: false })
  })

  it('should reject signed callbacks with non-scalar timing fields', async () => {
    const malformedBody = {
      ...body,
      bizDuration: null,
      requestTime: [],
      solveTime: {},
    }

    const result = await service.handleCallback(
      signedQuery(malformedBody),
      malformedBody as Record<string, unknown>,
    )

    expect(result).toEqual({ message: 'invalid body', success: false, code: 0, data: false })
  })

  it('should acknowledge failed transcription status and persist it without transcripts', async () => {
    const failedBody: CloudTranscriptionCallbackBodyDto = {
      ...body,
      result: [],
      statusCode: 500,
      statusText: 'FAILED',
    }

    const result = await service.handleCallback(signedQuery(failedBody), asRawBody(failedBody))

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchStatus: CloudTranscriptionMatchStatus.FAILED,
        matchReason: expect.stringContaining('provider failed'),
      }),
    )
    expect(transcriptRepo.save).not.toHaveBeenCalled()
    expect(callSummaryQueue.add).not.toHaveBeenCalled()
  })

  it('should expose extracted transcript text in order', () => {
    expect(service.extractTranscriptText(body)).toBe('hello\nworld')
  })

  it('should allow empty segment text without rejecting the callback', async () => {
    const bodyWithEmptyText: CloudTranscriptionCallbackBodyDto = {
      ...body,
      result: [
        { ...body.result[0], text: '' },
        { ...body.result[1], text: '  retained text  ' },
      ],
    }

    const result = await service.handleCallback(
      signedQuery(bodyWithEmptyText),
      asRawBody(bodyWithEmptyText),
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
    expect(service.extractTranscriptText(bodyWithEmptyText)).toBe('retained text')
  })

  function lastCallbackSave(): CloudTranscriptionCallback {
    return callbackRepo.save.mock.calls.at(-1)?.[0] as CloudTranscriptionCallback
  }

  function signedQuery(
    payload: CloudTranscriptionCallbackBodyDto | Record<string, unknown>,
  ): CloudTranscriptionCallbackQueryDto {
    const timestamp = String(now)
    const signedPayload = { ...(payload as Record<string, unknown>), timestamp, token }
    const first = md5(`${stableStringify(signedPayload)}${salt}`)
    return { token, timestamp, sign: md5(first) }
  }

  function signedQueryWithSortedFields(
    payload: CloudTranscriptionCallbackBodyDto | Record<string, unknown>,
  ): CloudTranscriptionCallbackQueryDto {
    const timestamp = String(now)
    const signedPayload = { ...(payload as Record<string, unknown>), timestamp, token }
    const first = md5(`${joinSortedFields(signedPayload)}${salt}`)
    return { token, timestamp, sign: md5(first) }
  }

  function asRawBody(payload: CloudTranscriptionCallbackBodyDto): Record<string, unknown> {
    return payload as unknown as Record<string, unknown>
  }

  function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value)
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
    const record = value as Record<string, unknown>
    const entries = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    return `{${entries.join(',')}}`
  }

  function md5(value: string): string {
    return createHash('md5').update(value, 'utf8').digest('hex')
  }

  function joinSortedFields(value: Record<string, unknown>): string {
    return Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${key}=${fieldValueToString(value[key])}`)
      .join('&')
  }

  function fieldValueToString(value: unknown): string {
    if (value === null) return ''
    if (typeof value === 'object') return stableStringify(value)
    return String(value)
  }
})
