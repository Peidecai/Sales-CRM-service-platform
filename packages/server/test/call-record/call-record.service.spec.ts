import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { CallRecordService } from '../../src/modules/call-record/call-record.service'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { UserRole } from '@crm/shared'
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

describe('CallRecordService', () => {
  let service: CallRecordService
  let repo: MockRepository<CallRecord>

  beforeEach(async () => {
    repo = createMockRepository<CallRecord>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallRecordService,
        { provide: getRepositoryToken(CallRecord), useValue: repo },
        { provide: getQueueToken('call-summary'), useValue: mockQueue },
      ],
    }).compile()

    service = module.get<CallRecordService>(CallRecordService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      customerId: 1,
      userId: 1,
      callAt: '2025-03-01T10:00:00Z',
      duration: 300,
      notes: 'Test notes',
    }

    it('should create call record with parsed date', async () => {
      const record = fixtures.callRecord()
      repo.create.mockReturnValue(record)
      repo.save.mockResolvedValue(record)

      const result = await service.create(dto as never)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 1,
        userId: 1,
        duration: 300,
      }))
      expect(repo.save).toHaveBeenCalled()
      expect(result.duration).toBe(300)
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

      const result = await service.findOne(1, adminUser)

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1, deleted: false },
        relations: ['customer', 'opportunity'],
      })
      expect(result.notes).toBe('Test call notes')
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
      repo.save.mockImplementation(async (r) => r)

      await service.remove(1)

      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }))
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
      expect(csv).toContain('客户,商机,通话时间,时长(秒),备注,AI摘要')
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

      expect(row).toMatch(/^,,,10,,$/)
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
