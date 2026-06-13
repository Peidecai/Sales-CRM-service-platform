import { createHash } from 'crypto'
import {
  CallDirection,
  CallResult,
  CallStatus,
  CallType,
  RecordingSourceType,
  SimCarrier,
} from '@crm/shared'
import { UnicomCallCallbackService } from '../../src/modules/recording/unicom-call-callback.service'
import {
  UnicomCallCallback,
  UnicomCallCallbackMatchStatus,
} from '../../src/modules/recording/entities/unicom-call-callback.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { User } from '../../src/modules/user/user.entity'
import { RecordingFile } from '../../src/modules/recording/entities/recording-file.entity'
import type { UnicomCallbackQueryDto } from '../../src/modules/recording/dto/unicom-callback.dto'
import {
  createMockConfigService,
  createMockRepository,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('UnicomCallCallbackService', () => {
  let service: UnicomCallCallbackService
  let callbackRepo: MockRepository<UnicomCallCallback>
  let callRecordRepo: MockRepository<CallRecord>
  let userRepo: MockRepository<User>
  let recordingFileRepo: MockRepository<RecordingFile>
  let ossRecording: {
    uploadFromUrl: jest.Mock
    getBucket: jest.Mock
  }
  let phoneBindingService: { findEnabledByPhone: jest.Mock }
  let transcriptionMatchQueue: { add: jest.Mock }
  let now: number

  const routePhone = '13800138000'
  const token = 'unicom-token'
  const salt = 'unicom-salt'

  const callPayload = {
    displayNumber: routePhone,
    types: 0,
    ringCauseDesc: '正常接通',
    callSid: 'call-sid-1',
    calledNo: '13900139000',
    accountName: '测试企业',
    orderId: 'order-1',
    appName: '测试应用',
    recordUrl: 'https://recording.example.com/call-sid-1.wav',
    callStartTime: '2026-05-06 10:00:00',
    callType: '呼出',
    recv183: '2',
    duration: 95,
    accountId: 'account-1',
    callerNo: routePhone,
    relatedCallSid: '',
    appId: 'app-1',
    startTime: '2026-05-06 10:00:05',
    ringDuration: 4,
    ringCause: '200',
    endTime: '2026-05-06 10:01:40',
    sipCause: 200,
    sipCauseDesc: '会话成功',
    isSuccess: 1,
  }

  const recordingPayload = {
    types: 4,
    callSid: 'call-sid-1',
    calledNo: '13900139000',
    isDual: 0,
    accountName: '测试企业',
    appName: '测试应用',
    recordUrl: 'https://recording.example.com/call-sid-1.wav',
    callType: '呼出',
    duration: 95,
    accountId: 'account-1',
    callerNo: routePhone,
    appId: 'app-1',
    startTime: '2026-05-06 10:00:05',
    endTime: '2026-05-06 10:01:40',
  }

  beforeEach(() => {
    now = Date.now()
    callbackRepo = createMockRepository<UnicomCallCallback>()
    callRecordRepo = createMockRepository<CallRecord>()
    userRepo = createMockRepository<User>()
    recordingFileRepo = createMockRepository<RecordingFile>()
    ossRecording = {
      uploadFromUrl: jest.fn().mockResolvedValue('unicom-recordings/13800138000/call-sid-1/mixed.wav'),
      getBucket: jest.fn().mockReturnValue('crm-call-recordings'),
    }
    phoneBindingService = { findEnabledByPhone: jest.fn().mockResolvedValue(null) }
    transcriptionMatchQueue = { add: jest.fn().mockResolvedValue({ id: 'match-job-1' }) }

    callbackRepo.findOne.mockResolvedValue(null)
    callbackRepo.find.mockResolvedValue([])
    callbackRepo.create.mockImplementation((payload) => ({ id: 50, ...payload }))
    callbackRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 50,
      ...record,
    }))

    callRecordRepo.findOne.mockResolvedValue(null)
    callRecordRepo.create.mockImplementation((payload) => ({ id: 60, ...payload }))
    callRecordRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 60,
      ...record,
    }))

    recordingFileRepo.findOne.mockResolvedValue(null)
    recordingFileRepo.create.mockImplementation((payload) => ({ id: 70, ...payload }))
    recordingFileRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 70,
      ...record,
    }))

    userRepo.find.mockResolvedValue([fixtures.user({ id: 7, phone: routePhone }) as User])

    service = new UnicomCallCallbackService(
      createMockConfigService({
        UNICOM_CALL_CALLBACK_TOKEN: token,
        UNICOM_CALL_CALLBACK_SALT: salt,
        UNICOM_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      userRepo as never,
      recordingFileRepo as never,
      ossRecording as never,
      phoneBindingService as never,
      transcriptionMatchQueue as never,
    )
  })

  it('should accept a signed call detail callback on a phone-specific URL and create a call record', async () => {
    const result = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
    expect(userRepo.find).toHaveBeenCalledWith({
      where: { phone: expect.any(Object), isActive: true },
    })
    expect(callRecordRepo.findOne).toHaveBeenCalledWith({
      where: {
        providerCallId: 'call-sid-1',
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      },
    })
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCallId: 'call-sid-1',
        userId: 7,
        callAt: new Date(2026, 4, 6, 10, 0, 0),
        duration: 95,
        estimatedDuration: 95,
        recordingUrl: 'https://recording.example.com/call-sid-1.wav',
        direction: CallDirection.OUTBOUND,
        callType: CallType.NORMAL,
        status: CallStatus.ENDED,
        callResult: CallResult.CONNECTED,
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      }),
    )
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        routePhone,
        callSid: 'call-sid-1',
        matchedCallRecordId: 60,
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
      }),
    )
    expect(transcriptionMatchQueue.add).toHaveBeenCalledWith(
      { callRecordId: 60 },
      expect.objectContaining({ jobId: 'unicom-call-match:60' }),
    )
    expect(ossRecording.uploadFromUrl).toHaveBeenCalledWith(
      'https://recording.example.com/call-sid-1.wav',
      'unicom-recordings/13800138000/call-sid-1/mixed.wav',
    )
    expect(recordingFileRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        callRecordId: 60,
        fileName: 'call-sid-1-mixed.wav',
        ossKey: 'unicom-recordings/13800138000/call-sid-1/mixed.wav',
        ossBucket: 'crm-call-recordings',
        durationSeconds: 95,
        mimeType: 'audio/wav',
        sourceType: RecordingSourceType.PLATFORM,
        counterpartPhone: '13900139000',
        actualCallTime: new Date(2026, 4, 6, 10, 0, 0),
        uploadedById: 7,
      }),
    )
  })

  it('should use an enabled phone binding before falling back to user phone lookup', async () => {
    phoneBindingService.findEnabledByPhone.mockResolvedValue({
      id: 10,
      phone: routePhone,
      userId: 9,
      user: fixtures.user({ id: 9, phone: '13900139000' }) as User,
    })

    const result = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(result.success).toBe(true)
    expect(userRepo.find).not.toHaveBeenCalled()
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      }),
    )
  })

  it('should route an account-level callback by payload phone binding', async () => {
    phoneBindingService.findEnabledByPhone.mockImplementation(async (phone: string) => {
      if (phone !== routePhone) return null
      return {
        id: 10,
        phone: routePhone,
        userId: 9,
        user: fixtures.user({ id: 9, phone: '13900139000' }) as User,
      }
    })

    const result = await service.handleCallback(undefined, signedQuery(callPayload), callPayload)

    expect(result.success).toBe(true)
    expect(phoneBindingService.findEnabledByPhone).toHaveBeenCalledWith(routePhone)
    expect(userRepo.find).not.toHaveBeenCalled()
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      }),
    )
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        routePhone,
        callSid: 'call-sid-1',
        matchedCallRecordId: 60,
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
      }),
    )
  })

  it('should prefer account-level Unicom credentials over stale legacy call credentials', async () => {
    const accountToken = 'account-unicom-token'
    const accountSalt = 'account-unicom-salt'
    const accountService = new UnicomCallCallbackService(
      createMockConfigService({
        UNICOM_CALLBACK_TOKEN: accountToken,
        UNICOM_CALLBACK_SALT: accountSalt,
        UNICOM_CALL_CALLBACK_TOKEN: 'stale-call-token',
        UNICOM_CALL_CALLBACK_SALT: 'stale-call-salt',
        UNICOM_CALLBACK_TIMESTAMP_TOLERANCE_MS: 15 * 60 * 1000,
      }) as never,
      callbackRepo as never,
      callRecordRepo as never,
      userRepo as never,
      recordingFileRepo as never,
      ossRecording as never,
      phoneBindingService as never,
      transcriptionMatchQueue as never,
    )
    phoneBindingService.findEnabledByPhone.mockImplementation(async (phone: string) => {
      if (phone !== routePhone) return null
      return {
        id: 10,
        phone: routePhone,
        userId: 9,
        user: fixtures.user({ id: 9, phone: '13900139000' }) as User,
      }
    })

    const timestamp = String(now)
    const signedPayload = { ...callPayload, timestamp: now, token: accountToken }
    const sign = md5(`${joinSortedFields(signedPayload)}${accountSalt}`)
    const result = await accountService.handleCallback(
      undefined,
      { token: accountToken, timestamp, sign },
      callPayload,
    )

    expect(result).toEqual({ message: 'success', success: true, code: 1, data: true })
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      }),
    )
  })

  it('should keep a recording callback pending when the matching call detail has not arrived', async () => {
    const result = await service.handleCallback(
      routePhone,
      signedQuery(recordingPayload),
      recordingPayload,
    )

    expect(result.success).toBe(true)
    expect(callRecordRepo.save).not.toHaveBeenCalled()
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        callSid: 'call-sid-1',
        types: 4,
        matchStatus: UnicomCallCallbackMatchStatus.PENDING,
        matchReason: 'waiting for matching call detail callback',
      }),
    )
  })

  it('should attach a pending recording callback after the call detail callback creates the record', async () => {
    const pendingRecording = {
      id: 51,
      routePhone,
      callSid: 'call-sid-1',
      types: 4,
      rawPayload: recordingPayload,
      matchStatus: UnicomCallCallbackMatchStatus.PENDING,
    } as unknown as UnicomCallCallback
    callbackRepo.find.mockResolvedValue([pendingRecording])

    await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(callbackRepo.find).toHaveBeenCalledWith({
      where: expect.arrayContaining([
        expect.objectContaining({ routePhone, callSid: 'call-sid-1', types: 4 }),
      ]),
    })
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCallId: 'call-sid-1',
        recordingUrl: 'https://recording.example.com/call-sid-1.wav',
      }),
    )
    expect(callbackRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 51,
        matchedCallRecordId: 60,
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
        matchReason: 'matched after call detail callback',
      }),
    )
  })

  it('should attach a recording callback immediately when the matching call record already exists', async () => {
    const existingRecord = fixtures.callRecord({
      id: 88,
      providerCallId: 'call-sid-1',
      recordingUrl: null,
      duration: 0,
      estimatedDuration: null,
      simNumber: routePhone,
      simCarrier: SimCarrier.CHINA_UNICOM,
    }) as CallRecord
    callRecordRepo.findOne.mockResolvedValue(existingRecord)

    const result = await service.handleCallback(
      routePhone,
      signedQuery(recordingPayload),
      recordingPayload,
    )

    expect(result.success).toBe(true)
    expect(existingRecord.recordingUrl).toBe('https://recording.example.com/call-sid-1.wav')
    expect(existingRecord.duration).toBe(95)
    expect(callRecordRepo.save).toHaveBeenCalledWith(existingRecord)
    expect(recordingFileRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        callRecordId: 88,
        ossKey: 'unicom-recordings/13800138000/call-sid-1/mixed.wav',
      }),
    )
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 88,
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
      }),
    )
  })

  it('should reject invalid signatures without saving callback data', async () => {
    const result = await service.handleCallback(
      routePhone,
      { token, timestamp: String(now), sign: 'bad' },
      callPayload,
    )

    expect(result).toEqual({ message: 'invalid sign', success: false, code: 0, data: false })
    expect(callbackRepo.save).not.toHaveBeenCalled()
  })

  it('should reject malformed route phones before global credential fallback', async () => {
    const malformedRoutePhone = '138'
    const malformedPayload = {
      ...callPayload,
      callerNo: malformedRoutePhone,
      displayNumber: malformedRoutePhone,
    }

    const result = await service.handleCallback(
      malformedRoutePhone,
      signedQuery(malformedPayload),
      malformedPayload,
    )

    expect(result).toEqual({
      message: 'invalid route phone',
      success: false,
      code: 0,
      data: false,
    })
    expect(callbackRepo.save).not.toHaveBeenCalled()
    expect(callRecordRepo.save).not.toHaveBeenCalled()
  })

  it('should fail a valid callback when the route phone is not assigned to an active user', async () => {
    userRepo.find.mockResolvedValue([])

    const result = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(result).toEqual({
      message: 'route phone not configured',
      success: false,
      code: 0,
      data: false,
    })
    expect(callRecordRepo.save).not.toHaveBeenCalled()
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchStatus: UnicomCallCallbackMatchStatus.FAILED,
        matchReason: `no active user found for route phone ${routePhone}`,
      }),
    )
  })

  it('should reject a callback whose payload phone does not belong to the route phone', async () => {
    const forgedPayload = {
      ...callPayload,
      callerNo: '13700137000',
      displayNumber: '13700137000',
    }

    const result = await service.handleCallback(
      routePhone,
      signedQuery(forgedPayload),
      forgedPayload,
    )

    expect(result).toEqual({
      message: 'route phone does not match payload',
      success: false,
      code: 0,
      data: false,
    })
    expect(userRepo.find).not.toHaveBeenCalled()
    expect(callRecordRepo.save).not.toHaveBeenCalled()
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchStatus: UnicomCallCallbackMatchStatus.FAILED,
        matchReason: expect.stringContaining(`route phone ${routePhone} does not match payload`),
      }),
    )
  })

  it('should fail when the route phone maps to multiple active users', async () => {
    userRepo.find.mockResolvedValue([
      fixtures.user({ id: 7, phone: routePhone }) as User,
      fixtures.user({ id: 8, phone: `86${routePhone}` }) as User,
    ])

    const result = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(result).toEqual({
      message: 'route phone has multiple active users',
      success: false,
      code: 0,
      data: false,
    })
    expect(callRecordRepo.save).not.toHaveBeenCalled()
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchStatus: UnicomCallCallbackMatchStatus.FAILED,
        matchReason: `multiple active users found for route phone ${routePhone}: 7,8`,
      }),
    )
  })

  it('should recover when a failed route-phone configuration is fixed and the vendor retries', async () => {
    userRepo.find.mockResolvedValueOnce([])

    const failed = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)
    const failedCallback = lastCallbackSave()
    expect(failed.success).toBe(false)
    expect(failedCallback.matchStatus).toBe(UnicomCallCallbackMatchStatus.FAILED)

    callbackRepo.findOne.mockResolvedValue(failedCallback)
    userRepo.find.mockResolvedValue([fixtures.user({ id: 7, phone: routePhone }) as User])

    const retried = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(retried.success).toBe(true)
    expect(callRecordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCallId: 'call-sid-1',
        simNumber: routePhone,
        simCarrier: SimCarrier.CHINA_UNICOM,
      }),
    )
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
        matchedCallRecordId: 60,
      }),
    )
  })

  it('should recover from a concurrent duplicate call record insert', async () => {
    const duplicateError = Object.assign(new Error('Duplicate entry'), {
      code: 'ER_DUP_ENTRY',
      errno: 1062,
    })
    const existingRecord = fixtures.callRecord({
      id: 61,
      providerCallId: 'call-sid-1',
      simNumber: routePhone,
      simCarrier: SimCarrier.CHINA_UNICOM,
    }) as CallRecord
    callRecordRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existingRecord)
    callRecordRepo.save.mockRejectedValueOnce(duplicateError)

    const result = await service.handleCallback(routePhone, signedQuery(callPayload), callPayload)

    expect(result.success).toBe(true)
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 61,
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
      }),
    )
  })

  it('should still accept a matched recording callback when OSS mirroring fails', async () => {
    const existingRecord = fixtures.callRecord({
      id: 88,
      providerCallId: 'call-sid-1',
      recordingUrl: null,
      duration: 0,
      estimatedDuration: null,
      simNumber: routePhone,
      simCarrier: SimCarrier.CHINA_UNICOM,
    }) as CallRecord
    callRecordRepo.findOne.mockResolvedValue(existingRecord)
    ossRecording.uploadFromUrl.mockRejectedValueOnce(new Error('temporary fetch failure'))

    const result = await service.handleCallback(
      routePhone,
      signedQuery(recordingPayload),
      recordingPayload,
    )

    expect(result.success).toBe(true)
    expect(callRecordRepo.save).toHaveBeenCalledWith(existingRecord)
    expect(recordingFileRepo.save).not.toHaveBeenCalled()
    expect(lastCallbackSave()).toEqual(
      expect.objectContaining({
        matchedCallRecordId: 88,
        matchStatus: UnicomCallCallbackMatchStatus.MATCHED,
      }),
    )
  })

  it('should accept the sorted JSON signature format from the vendor document', async () => {
    const result = await service.handleCallback(
      routePhone,
      signedQuery(callPayload, 'stable-json'),
      callPayload,
    )

    expect(result.success).toBe(true)
  })

  function lastCallbackSave(): UnicomCallCallback {
    return callbackRepo.save.mock.calls.at(-1)?.[0] as UnicomCallCallback
  }

  function signedQuery(
    payload: Record<string, unknown>,
    mode: 'sorted-fields' | 'stable-json' = 'sorted-fields',
  ): UnicomCallbackQueryDto {
    const timestamp = String(now)
    const signedPayload = { ...payload, timestamp: now, token }
    const source =
      mode === 'stable-json' ? stableStringify(signedPayload) : joinSortedFields(signedPayload)
    const sign = md5(`${source}${salt}`)
    return { token, timestamp, sign }
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

  function md5(value: string): string {
    return createHash('md5').update(value, 'utf8').digest('hex')
  }
})
