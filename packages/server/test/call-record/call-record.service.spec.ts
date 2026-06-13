import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { CallRecordService } from '../../src/modules/call-record/call-record.service'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { User } from '../../src/modules/user/user.entity'
import { CallTranscript } from '../../src/modules/recording/entities/call-transcript.entity'
import { RecordingFile } from '../../src/modules/recording/entities/recording-file.entity'
import { CloudTranscriptionCallback } from '../../src/modules/recording/entities/cloud-transcription-callback.entity'
import { CloudTranscriptionMatchStatus } from '../../src/modules/recording/entities/cloud-transcription-callback.entity'
import { CallResult, CallStatus, CallType, UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

const adminUser: AuthUser = { id: 2, username: 'admin', role: UserRole.ADMIN }
const salesUser: AuthUser = { id: 1, username: 'sales1', role: UserRole.SALES }
const otherSalesUser: AuthUser = { id: 3, username: 'sales2', role: UserRole.SALES }

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
}
const mockTranscriptionMatchQueue = {
  add: jest.fn().mockResolvedValue({ id: 'match-job-123' }),
}

describe('CallRecordService', () => {
  let service: CallRecordService
  let repo: MockRepository<CallRecord>
  let customerRepo: MockRepository<Customer>
  let userRepo: MockRepository<User>
  let transcriptRepo: MockRepository<CallTranscript>
  let recordingFileRepo: MockRepository<RecordingFile>
  let cloudTranscriptionCallbackRepo: MockRepository<CloudTranscriptionCallback>

  beforeEach(async () => {
    repo = createMockRepository<CallRecord>()
    customerRepo = createMockRepository<Customer>()
    userRepo = createMockRepository<User>()
    transcriptRepo = createMockRepository<CallTranscript>()
    recordingFileRepo = createMockRepository<RecordingFile>()
    cloudTranscriptionCallbackRepo = createMockRepository<CloudTranscriptionCallback>()
    transcriptRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))
    recordingFileRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))
    cloudTranscriptionCallbackRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))
    mockQueue.add.mockClear()
    mockTranscriptionMatchQueue.add.mockClear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallRecordService,
        { provide: getRepositoryToken(CallRecord), useValue: repo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(CallTranscript), useValue: transcriptRepo },
        { provide: getRepositoryToken(RecordingFile), useValue: recordingFileRepo },
        {
          provide: getRepositoryToken(CloudTranscriptionCallback),
          useValue: cloudTranscriptionCallbackRepo,
        },
        { provide: getQueueToken('call-summary'), useValue: mockQueue },
        { provide: getQueueToken('cloud-transcription-match'), useValue: mockTranscriptionMatchQueue },
      ],
    }).compile()

    service = module.get<CallRecordService>(CallRecordService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      customerId: 1,
      userId: 99,
      callAt: '2025-03-01T10:00:00Z',
      duration: 300,
      notes: 'Test notes',
    }

    it('should create call record for current user and ignore client userId', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ assignedUserId: salesUser.id }))
      repo.create.mockImplementation((payload) => fixtures.callRecord(payload as Record<string, unknown>))
      repo.save.mockImplementation(async (record) => record)

      const result = await service.create(dto as never, salesUser)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 1,
        userId: salesUser.id,
        duration: 300,
      }))
      expect(repo.save).toHaveBeenCalled()
      expect(result.duration).toBe(300)
    })

    it('should reject sales users creating records for unassigned customers', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ assignedUserId: 99 }))

      await expect(service.create(dto as never, salesUser)).rejects.toThrow(ForbiddenException)
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('createNativeOutbound', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-04-30T03:00:00.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    const dto = {
      clientCallId: 'native-test-call-1',
      customerId: 1,
      customerPhone: '+86 13800138001',
      startedAt: '2026-04-30T02:00:00.000Z',
      endedAt: '2026-04-30T02:02:05.000Z',
      callResult: CallResult.CONNECTED,
      notes: '  discussed pricing  ',
      simSlot: 1,
    }

    it('should create native outbound record from current user and bound phone', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ phone: '13800138001' }))
      userRepo.findOne.mockResolvedValue(fixtures.user({ id: salesUser.id, phone: '13900139000' }))
      repo.create.mockImplementation((payload) => ({ id: 10, ...payload }))
      repo.save.mockImplementation(async (record) => record)

      const result = await service.createNativeOutbound(dto, salesUser)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 1,
        clientCallId: 'native-test-call-1',
        userId: salesUser.id,
        duration: 125,
        estimatedDuration: 125,
        callType: CallType.MANUAL,
        callResult: CallResult.CONNECTED,
        status: CallStatus.ENDED,
        simSlot: 1,
        simNumber: '13900139000',
        notes: 'discussed pricing',
      }))
      expect(result.userId).toBe(salesUser.id)
      expect(mockTranscriptionMatchQueue.add).toHaveBeenCalledWith(
        { callRecordId: 10 },
        expect.objectContaining({ jobId: 'native-outbound-match:10' }),
      )
    })

    it('should return existing native outbound record for a repeated client call id', async () => {
      const existing = fixtures.callRecord({
        id: 11,
        userId: salesUser.id,
        clientCallId: dto.clientCallId,
      }) as CallRecord
      repo.findOne.mockResolvedValue(existing)

      const result = await service.createNativeOutbound(dto, salesUser)

      expect(result).toBe(existing)
      expect(customerRepo.findOne).not.toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
      expect(mockTranscriptionMatchQueue.add).not.toHaveBeenCalled()
    })

    it('should recover from duplicate client call id races by returning the existing record', async () => {
      const existing = fixtures.callRecord({
        id: 12,
        userId: salesUser.id,
        clientCallId: dto.clientCallId,
      }) as CallRecord
      repo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing)
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ phone: '13800138001' }))
      userRepo.findOne.mockResolvedValue(fixtures.user({ id: salesUser.id, phone: '13900139000' }))
      repo.create.mockImplementation((payload) => ({ id: 10, ...payload }))
      repo.save.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' })

      const result = await service.createNativeOutbound(dto, salesUser)

      expect(result).toBe(existing)
      expect(mockTranscriptionMatchQueue.add).not.toHaveBeenCalled()
    })

    it('should reject sales users creating records for unassigned customers', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ assignedUserId: 99 }))

      await expect(service.createNativeOutbound(dto, salesUser)).rejects.toThrow(ForbiddenException)
      expect(repo.save).not.toHaveBeenCalled()
    })

    it('should reject customer phone mismatches', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ phone: '13800138002' }))

      await expect(service.createNativeOutbound(dto, salesUser)).rejects.toThrow(BadRequestException)
      expect(repo.save).not.toHaveBeenCalled()
    })

    it('should reject end time earlier than start time', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ phone: '13800138001' }))

      await expect(
        service.createNativeOutbound({ ...dto, endedAt: '2026-04-30T01:59:59.000Z' }, salesUser),
      ).rejects.toThrow(BadRequestException)
      expect(repo.save).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when customer does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.createNativeOutbound(dto, salesUser)).rejects.toThrow(NotFoundException)
    })

    it('should reject future native outbound call times', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ phone: '13800138001' }))

      await expect(
        service.createNativeOutbound({
          ...dto,
          startedAt: '2026-04-30T03:10:01.000Z',
          endedAt: '2026-04-30T03:11:01.000Z',
        }, salesUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject native outbound calls longer than 24 hours', async () => {
      customerRepo.findOne.mockResolvedValue(fixtures.customer({ phone: '13800138001' }))

      await expect(
        service.createNativeOutbound({
          ...dto,
          startedAt: '2026-04-28T02:00:00.000Z',
          endedAt: '2026-04-29T02:00:01.000Z',
        }, salesUser),
      ).rejects.toThrow(BadRequestException)
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should use default page and pageSize when omitted', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({} as never, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('should return paginated list', async () => {
      const records = [fixtures.callRecord()]
      const qb = createMockQueryBuilder(records, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 } as never, adminUser)

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should apply customerId filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, customerId: 5 } as never, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.customerId = :customerId',
        { customerId: 5 },
      )
    })

    it('should apply opportunityId filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, opportunityId: 3 } as never, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.opportunityId = :opportunityId',
        { opportunityId: 3 },
      )
    })

    it('should apply date range filters', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({
        page: 1,
        pageSize: 20,
        startDate: '2025-01-01',
        endDate: '2025-03-31',
      } as never, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.callAt >= :startDate',
        expect.objectContaining({ startDate: expect.any(Date) }),
      )
      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.callAt <= :endDate',
        expect.objectContaining({ endDate: expect.any(Date) }),
      )
    })

    it('should enforce data permission for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20 } as never, salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.userId = :currentUserId',
        { currentUserId: salesUser.id },
      )
    })

    it('should ignore userId query param for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, userId: 99 } as never, salesUser)

      // The userId=99 filter should be ignored for SALES
      const filterCalls = qb.andWhere.mock.calls
      const userIdFilter = filterCalls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes(':userId') && !c[0].includes(':currentUserId'),
      )
      expect(userIdFilter).toBeUndefined()
    })

    it('should apply userId filter for admin', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, userId: 5 } as never, adminUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.userId = :userId',
        { userId: 5 },
      )
    })

    it('should paginate correctly', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 3, pageSize: 10 } as never, adminUser)

      expect(qb.skip).toHaveBeenCalledWith(20) // (3-1) * 10
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return call record with relations', async () => {
      const record = fixtures.callRecord()
      repo.findOne.mockResolvedValue(record)
      transcriptRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))
      cloudTranscriptionCallbackRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))

      const result = await service.findOne(1, adminUser)

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['customer', 'opportunity', 'user'],
      })
      expect(result.notes).toBe('Test call notes')
    })

    it('should not expose password on nested user relation', async () => {
      const record = fixtures.callRecord({
        user: fixtures.user({ password: '$2a$10$leakedhash' }),
      })
      repo.findOne.mockResolvedValue(record)

      const result = await service.findOne(1, adminUser)

      expect(result.user).toMatchObject({
        id: 1,
        username: 'testuser',
        name: 'Test User',
      })
      expect(result.user).not.toHaveProperty('password')
    })

    it('should prefer recording counterpart phone for the displayed call number', async () => {
      const record = fixtures.callRecord({
        id: 44,
        simNumber: '13900139000',
        customer: fixtures.customer({ phone: '13800138001' }),
        user: fixtures.user({ phone: '13900139000' }),
      })
      repo.findOne.mockResolvedValue(record)
      const recordingFileQb = createMockQueryBuilder([
        {
          callRecordId: 44,
          counterpartPhone: '13700137000',
        },
      ])
      recordingFileRepo.createQueryBuilder.mockReturnValue(recordingFileQb)

      const result = await service.findOne(44, adminUser)

      expect(recordingFileQb.where).toHaveBeenCalledWith('rf.callRecordId IN (:...callRecordIds)', {
        callRecordIds: [44],
      })
      expect(result.counterpartPhone).toBe('13700137000')
      expect(result.callPhoneNumber).toBe('13700137000')
      expect(result.salesUserPhone).toBe('13900139000')
    })

    it('should not use the sales line number as the counterpart display number', async () => {
      const record = fixtures.callRecord({
        id: 45,
        customer: null,
        simNumber: '13900139000',
        user: fixtures.user({ phone: '13900139000' }),
      })
      repo.findOne.mockResolvedValue(record)

      const result = await service.findOne(45, adminUser)

      expect(result.counterpartPhone).toBeNull()
      expect(result.callPhoneNumber).toBeNull()
      expect(result.salesUserPhone).toBe('13900139000')
    })

    it('should include normalized transcript segments on detail', async () => {
      const record = fixtures.callRecord({ id: 42 })
      repo.findOne.mockResolvedValue(record)
      const transcriptQb = createMockQueryBuilder([
        {
          id: 10,
          speaker: 'agent',
          startTimeMs: 0,
          endTimeMs: 1200,
          text: '您好，我是销售小王',
          segmentIndex: 0,
        },
        {
          id: 11,
          speaker: 'customer',
          startTimeMs: 1300,
          endTimeMs: 3200,
          text: '我想了解贷款方案',
          segmentIndex: 1,
        },
      ])
      transcriptRepo.createQueryBuilder.mockReturnValue(transcriptQb)
      cloudTranscriptionCallbackRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))

      const result = await service.findOne(42, adminUser)

      expect(transcriptQb.innerJoin).toHaveBeenCalledWith('asr_tasks', 'at', 'at.id = ct.asr_task_id')
      expect(transcriptQb.innerJoin).toHaveBeenCalledWith(
        'recording_files',
        'rf',
        'rf.id = at.recording_file_id',
      )
      expect(transcriptQb.where).toHaveBeenCalledWith('rf.call_record_id = :callRecordId', {
        callRecordId: 42,
      })
      expect(result.transcriptSegments).toEqual([
        {
          id: 10,
          speaker: 'agent',
          startTimeMs: 0,
          endTimeMs: 1200,
          text: '您好，我是销售小王',
          segmentIndex: 0,
        },
        {
          id: 11,
          speaker: 'customer',
          startTimeMs: 1300,
          endTimeMs: 3200,
          text: '我想了解贷款方案',
          segmentIndex: 1,
        },
      ])
      expect(result.transcriptText).toBe('您好，我是销售小王\n我想了解贷款方案')
      expect(result.transcriptSegmentCount).toBe(2)
      expect(result.transcriptTextLen).toBe(18)
    })

    it('should fallback to matched cloud callback text when transcript rows are missing', async () => {
      const record = fixtures.callRecord({ id: 43 })
      repo.findOne.mockResolvedValue(record)
      transcriptRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))
      const callbackQb = createMockQueryBuilder([
        {
          taskId: 'task-1',
          transcriptText: '联通转写第一句\n联通转写第二句',
        },
      ])
      cloudTranscriptionCallbackRepo.createQueryBuilder.mockReturnValue(callbackQb)

      const result = await service.findOne(43, adminUser)

      expect(callbackQb.where).toHaveBeenCalledWith('ctc.matchedCallRecordId = :callRecordId', {
        callRecordId: 43,
      })
      expect(callbackQb.andWhere).toHaveBeenCalledWith('ctc.matchStatus = :matchStatus', {
        matchStatus: CloudTranscriptionMatchStatus.MATCHED,
      })
      expect(result.transcriptText).toBe('联通转写第一句\n联通转写第二句')
      expect(result.transcriptSegments).toEqual([])
      expect(result.transcriptSegmentCount).toBe(0)
      expect(result.transcriptTextLen).toBe(15)
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999, adminUser)).rejects.toThrow(NotFoundException)
    })

    it('should allow SALES user to access own record', async () => {
      const record = fixtures.callRecord({ userId: salesUser.id })
      repo.findOne.mockResolvedValue(record)

      const result = await service.findOne(1, salesUser)
      expect(result.userId).toBe(salesUser.id)
    })

    it('should throw ForbiddenException for SALES accessing other user record', async () => {
      const record = fixtures.callRecord({ userId: 99 })
      repo.findOne.mockResolvedValue(record)

      await expect(service.findOne(1, otherSalesUser)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update call record', async () => {
      const record = fixtures.callRecord()
      repo.findOne.mockResolvedValue({ ...record })
      repo.save.mockImplementation(async (r) => r)

      const result = await service.update(1, { notes: 'Updated notes' } as never, adminUser)

      expect(result.notes).toBe('Updated notes')
    })

    it('should update callAt when provided', async () => {
      const record = fixtures.callRecord()
      repo.findOne.mockResolvedValue({ ...record })
      repo.save.mockImplementation(async (r) => r)

      const result = await service.update(1, { callAt: '2025-06-01T10:00:00Z' } as never, adminUser)

      expect(result.callAt).toEqual(new Date('2025-06-01T10:00:00Z'))
    })

    it('should throw ForbiddenException for SALES updating other user record', async () => {
      const record = fixtures.callRecord({ userId: 99 })
      repo.findOne.mockResolvedValue(record)

      await expect(service.update(1, { notes: 'X' } as never, otherSalesUser)).rejects.toThrow(ForbiddenException)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete call record', async () => {
      const record = fixtures.callRecord()
      repo.findOne.mockResolvedValue({ ...record })
      repo.softRemove.mockResolvedValue(record)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- getStats ---------- */
  describe('getStats', () => {
    it('should calculate week start from Sunday correctly', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-03-08T10:00:00.000Z')) // Sunday

      const totalQb = createMockQueryBuilder([], 0)
      totalQb.getCount.mockResolvedValue(3)
      totalQb.getRawOne.mockResolvedValue({ total: '600' })

      const weekQb = createMockQueryBuilder([], 0)
      weekQb.getCount.mockResolvedValue(2)

      repo.createQueryBuilder
        .mockReturnValueOnce(totalQb)
        .mockReturnValueOnce(weekQb)

      const result = await service.getStats(adminUser)

      const weekStartArg = weekQb.andWhere.mock.calls.find(
        (c: unknown[]) => c[0] === 'cr.callAt >= :weekStart',
      )?.[1] as { weekStart: Date }
      expect(weekStartArg.weekStart.getDay()).toBe(1) // Monday
      expect(weekStartArg.weekStart.getHours()).toBe(0)
      expect(result.weekCount).toBe(2)

      jest.useRealTimers()
    })

    it('should return stats for admin (all records)', async () => {
      const qb = createMockQueryBuilder([], 5)
      qb.getCount.mockResolvedValue(5)
      qb.getRawOne.mockResolvedValue({ total: '1500' })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStats(adminUser)

      expect(result.totalCount).toBe(5)
      expect(result.totalDuration).toBe(1500)
      expect(typeof result.weekCount).toBe('number')
    })

    it('should filter by userId for SALES user', async () => {
      const qb = createMockQueryBuilder([], 0)
      qb.getCount.mockResolvedValue(2)
      qb.getRawOne.mockResolvedValue({ total: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStats(salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.userId = :currentUserId',
        { currentUserId: salesUser.id },
      )
      expect(result.totalDuration).toBe(0)
    })
  })

  /* ---------- exportCsv ---------- */
  describe('exportCsv', () => {
    it('should export CSV with BOM and header', async () => {
      const records = [
        fixtures.callRecord({
          customer: { name: '客户A' },
          opportunity: { title: '商机B' },
          callAt: new Date('2025-03-01T10:00:00Z'),
          duration: 300,
          notes: 'notes',
          aiSummary: 'summary',
        }),
      ]
      const qb = createMockQueryBuilder(records, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)

      expect(csv.charCodeAt(0)).toBe(0xFEFF) // BOM
      expect(csv).toContain('客户,商机,通话时间,时长(秒),呼叫类型,通话结果,估算时长(秒),备注,AI摘要')
      expect(csv).toContain('客户A')
    })

    it('should enforce data permission for SALES', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.exportCsv(salesUser)

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cr.userId = :currentUserId',
        { currentUserId: salesUser.id },
      )
    })

    it('should fallback empty relation/date/note fields and escape CSV content', async () => {
      const records = [
        fixtures.callRecord({
          customer: null,
          opportunity: null,
          callAt: null,
          duration: undefined,
          notes: 'note,\nline',
          aiSummary: 'summary "q"',
        }),
      ]
      const qb = createMockQueryBuilder(records, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)

      expect(csv).toContain(',,,' )
      expect(csv).toContain(',0,')
      expect(csv).toContain('"note,\nline"')
      expect(csv).toContain('"summary ""q"""')
    })

    it('should fallback null notes and summary to empty CSV fields', async () => {
      const records = [
        fixtures.callRecord({
          customer: null,
          opportunity: null,
          callAt: null,
          duration: 10,
          notes: null,
          aiSummary: null,
        }),
      ]
      const qb = createMockQueryBuilder(records, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const csv = await service.exportCsv(adminUser)
      const row = csv.split('\n')[1]

      expect(row).toMatch(/^,,,10,,,,,$/)
    })
  })

  /* ---------- summarize ---------- */
  describe('summarize', () => {
    it('should submit job and return jobId', async () => {
      const record = fixtures.callRecord({ notes: 'Some notes' })
      repo.findOne.mockResolvedValue(record)

      const result = await service.summarize(1, adminUser)

      expect(mockQueue.add).toHaveBeenCalledWith(
        { callRecordId: 1 },
        expect.objectContaining({ attempts: 3 }),
      )
      expect(result.jobId).toBe('job-123')
    })

    it('should throw BadRequestException if no notes', async () => {
      const record = fixtures.callRecord({ notes: null })
      repo.findOne.mockResolvedValue(record)

      await expect(service.summarize(1, adminUser)).rejects.toThrow(BadRequestException)
    })

    it('should throw ForbiddenException for SALES summarizing other user record', async () => {
      const record = fixtures.callRecord({ userId: 99, notes: 'some notes' })
      repo.findOne.mockResolvedValue(record)

      await expect(service.summarize(1, otherSalesUser)).rejects.toThrow(ForbiddenException)
    })
  })
})
