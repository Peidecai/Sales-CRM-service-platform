import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ServiceRecordService } from '../../src/modules/service-record/service-record.service'
import { ServiceRecord } from '../../src/modules/service-record/entities/service-record.entity'
import { ServiceType, ServiceStatus, ServicePriority, UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
  type MockQueryBuilder,
} from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

describe('ServiceRecordService', () => {
  let service: ServiceRecordService
  let repo: MockRepository<ServiceRecord>

  const adminUser: AuthUser = { id: 2, role: UserRole.ADMIN, username: 'admin' }
  const salesUser: AuthUser = { id: 1, role: UserRole.SALES, username: 'sales' }
  const managerUser: AuthUser = { id: 3, role: UserRole.MANAGER, username: 'manager' }

  const baseRecord = {
    id: 1,
    title: '客户投诉产品质量',
    description: '产品存在质量问题',
    type: ServiceType.COMPLAINT,
    status: ServiceStatus.PENDING,
    priority: ServicePriority.HIGH,
    customerId: 1,
    contractId: null,
    assigneeId: 1,
    createdBy: 1,
    resolution: null,
    satisfactionScore: null,
    satisfactionComment: null,
    slaResponseDeadline: new Date('2025-01-01T05:00:00Z'),
    slaResolveDeadline: new Date('2025-01-02T01:00:00Z'),
    respondedAt: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2025-01-01T01:00:00Z'),
    updatedAt: new Date('2025-01-01T01:00:00Z'),
    deletedAt: null,
    customer: fixtures.customer(),
  }

  beforeEach(async () => {
    repo = createMockRepository<ServiceRecord>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRecordService,
        { provide: getRepositoryToken(ServiceRecord), useValue: repo },
      ],
    }).compile()

    service = module.get(ServiceRecordService)
  })

  // ─── create ────────────────────────────────────────────────────────────

  it('should create a service record with SLA deadlines', async () => {
    const dto = {
      title: 'Test',
      description: 'Desc',
      type: ServiceType.COMPLAINT,
      priority: ServicePriority.URGENT,
      customerId: 1,
    }
    repo.create.mockReturnValue({ ...dto, id: 1 })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.create(dto, 1)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test',
        createdBy: 1,
        slaResponseDeadline: expect.any(Date),
        slaResolveDeadline: expect.any(Date),
      }),
    )
    expect(repo.save).toHaveBeenCalled()
  })

  it('should default priority to MEDIUM', async () => {
    const dto = { title: 'T', description: 'D', type: ServiceType.CONSULTATION, customerId: 1 }
    repo.create.mockReturnValue({ ...dto, id: 1, priority: ServicePriority.MEDIUM })
    repo.save.mockImplementation(async (e) => e)

    await service.create(dto, 1)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: ServicePriority.MEDIUM }),
    )
  })

  // ─── findAll ───────────────────────────────────────────────────────────

  it('should return paginated list', async () => {
    const qb = createMockQueryBuilder([baseRecord], 1)
    repo.createQueryBuilder.mockReturnValue(qb)

    const result = await service.findAll({ page: 1, pageSize: 10 }, adminUser)
    expect(result.list).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
  })

  it('should filter by status', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({ status: ServiceStatus.PENDING }, adminUser)
    expect(qb.andWhere).toHaveBeenCalledWith('sr.status = :status', { status: ServiceStatus.PENDING })
  })

  it('should filter by type', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({ type: ServiceType.COMPLAINT }, adminUser)
    expect(qb.andWhere).toHaveBeenCalledWith('sr.type = :type', { type: ServiceType.COMPLAINT })
  })

  it('should restrict SALES users to own records', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({}, salesUser)
    expect(qb.andWhere).toHaveBeenCalledWith(
      'sr.createdBy = :uid OR sr.assigneeId = :uid',
      { uid: 1 },
    )
  })

  it('should filter by keyword', async () => {
    const qb = createMockQueryBuilder([], 0)
    repo.createQueryBuilder.mockReturnValue(qb)

    await service.findAll({ keyword: 'test' }, adminUser)
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(sr.title LIKE :kw OR sr.description LIKE :kw)',
      { kw: '%test%' },
    )
  })

  // ─── findOne ───────────────────────────────────────────────────────────

  it('should return a record by id', async () => {
    repo.findOne.mockResolvedValue(baseRecord)
    const result = await service.findOne(1)
    expect(result.id).toBe(1)
  })

  it('should throw NotFoundException if not found', async () => {
    repo.findOne.mockResolvedValue(null)
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
  })

  // ─── update ────────────────────────────────────────────────────────────

  it('should update a record', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.update(1, { title: 'Updated' })
    expect(result.title).toBe('Updated')
  })

  // ─── updateStatus ─────────────────────────────────────────────────────

  it('should transition from PENDING to PROCESSING', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.PENDING, respondedAt: null })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.updateStatus(1, ServiceStatus.PROCESSING, adminUser)
    expect(result.status).toBe(ServiceStatus.PROCESSING)
    expect(result.respondedAt).toBeInstanceOf(Date)
  })

  it('should transition from PROCESSING to RESOLVED', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.PROCESSING })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.updateStatus(1, ServiceStatus.RESOLVED, adminUser)
    expect(result.status).toBe(ServiceStatus.RESOLVED)
    expect(result.resolvedAt).toBeInstanceOf(Date)
  })

  it('should allow RESOLVED to PROCESSING (reopen)', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.RESOLVED })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.updateStatus(1, ServiceStatus.PROCESSING, salesUser)
    expect(result.status).toBe(ServiceStatus.PROCESSING)
  })

  it('should reject invalid transition for SALES user', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.PENDING })
    await expect(
      service.updateStatus(1, ServiceStatus.RESOLVED, salesUser),
    ).rejects.toThrow(BadRequestException)
  })

  it('should allow Manager to force close from any state', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.PENDING })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.updateStatus(1, ServiceStatus.CLOSED, managerUser)
    expect(result.status).toBe(ServiceStatus.CLOSED)
  })

  // ─── close ─────────────────────────────────────────────────────────────

  it('should close a RESOLVED record with satisfaction', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.RESOLVED })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.close(1, { satisfactionScore: 4, satisfactionComment: 'Good' }, salesUser)
    expect(result.status).toBe(ServiceStatus.CLOSED)
    expect(result.satisfactionScore).toBe(4)
    expect(result.closedAt).toBeInstanceOf(Date)
  })

  it('should reject close from non-RESOLVED for SALES user', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.PROCESSING })
    await expect(
      service.close(1, { satisfactionScore: 3 }, salesUser),
    ).rejects.toThrow(BadRequestException)
  })

  it('should allow Manager to close from any state', async () => {
    repo.findOne.mockResolvedValue({ ...baseRecord, status: ServiceStatus.PROCESSING })
    repo.save.mockImplementation(async (e) => e)

    const result = await service.close(1, { satisfactionScore: 5 }, managerUser)
    expect(result.status).toBe(ServiceStatus.CLOSED)
  })

  // ─── remove ────────────────────────────────────────────────────────────

  it('should soft remove a record', async () => {
    repo.findOne.mockResolvedValue(baseRecord)
    repo.softRemove.mockResolvedValue(baseRecord)

    await service.remove(1)
    expect(repo.softRemove).toHaveBeenCalled()
  })

  // ─── exportCsv ─────────────────────────────────────────────────────────

  it('should generate CSV with Chinese headers', async () => {
    repo.find.mockResolvedValue([baseRecord])
    const csv = await service.exportCsv()
    expect(csv).toContain('ID,标题,类型,状态,优先级,客户,满意度,创建时间')
    expect(csv).toContain('投诉')
  })

  // ─── getStatistics ─────────────────────────────────────────────────────

  it('should return statistics', async () => {
    const qb = createMockQueryBuilder([], 5)
    repo.createQueryBuilder.mockReturnValue(qb)
    qb.getRawMany.mockResolvedValue([{ status: 'pending', count: '3' }])
    qb.getRawOne.mockResolvedValue({ avg: '4.2' })

    const result = await service.getStatistics()
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('byStatus')
    expect(result).toHaveProperty('byType')
  })

  // ─── getSlaAlerts ──────────────────────────────────────────────────────

  it('should return SLA alerts', async () => {
    const qb = createMockQueryBuilder([baseRecord], 1)
    repo.createQueryBuilder.mockReturnValue(qb)

    const result = await service.getSlaAlerts()
    expect(qb.andWhere).toHaveBeenCalled()
    expect(Array.isArray(result)).toBe(true)
  })

  // ─── findByCustomer ────────────────────────────────────────────────────

  it('should return records for a customer', async () => {
    repo.findAndCount.mockResolvedValue([[baseRecord], 1])
    const result = await service.findByCustomer(1)
    expect(result.list).toHaveLength(1)
    expect(result.total).toBe(1)
  })
})
