import { Test, TestingModule } from '@nestjs/testing'
import { UserRole } from '@crm/shared'
import { CallRecordController } from '../../src/modules/call-record/call-record.controller'
import { CallRecordService } from '../../src/modules/call-record/call-record.service'
import { LeaderReviewService } from '../../src/modules/call-record/leader-review.service'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'

describe('CallRecordController', () => {
  let controller: CallRecordController
  let callRecordService: {
    findAll: jest.Mock
    create: jest.Mock
    exportCsv: jest.Mock
    getStats: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    remove: jest.Mock
    summarize: jest.Mock
  }
  let notificationService: {
    callRecordCreated: jest.Mock
    callRecordDeleted: jest.Mock
  }

  const user = {
    id: 2,
    username: 'sales-b',
    role: UserRole.SALES,
  } as never

  beforeEach(async () => {
    callRecordService = {
      findAll: jest.fn(),
      create: jest.fn(),
      exportCsv: jest.fn(),
      getStats: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      summarize: jest.fn(),
    }
    notificationService = {
      callRecordCreated: jest.fn(),
      callRecordDeleted: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallRecordController],
      providers: [
        { provide: CallRecordService, useValue: callRecordService },
        { provide: NotificationService, useValue: notificationService },
        { provide: LeaderReviewService, useValue: { findByCustomer: jest.fn(), findByCallRecord: jest.fn(), create: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile()

    controller = module.get<CallRecordController>(CallRecordController)
  })

  it('findAll should delegate to service', async () => {
    const query = { page: 1, pageSize: 20 }
    const pageData = { list: [{ id: 1 }], total: 1, page: 1, pageSize: 20 }
    callRecordService.findAll.mockResolvedValue(pageData)

    const result = await controller.findAll(query as never, user)

    expect(callRecordService.findAll).toHaveBeenCalledWith(query, user)
    expect(result).toBe(pageData)
  })

  it('create should notify after creating a call record', async () => {
    const dto = { customerId: 3, notes: 'spoke with customer' }
    const record = { id: 77 }
    callRecordService.create.mockResolvedValue(record)

    const result = await controller.create(dto as never, user)

    expect(callRecordService.create).toHaveBeenCalledWith(dto)
    expect(notificationService.callRecordCreated).toHaveBeenCalledWith(2, 'sales-b', 77)
    expect(result).toBe(record)
  })

  it('exportCsv should set headers and send CSV', async () => {
    callRecordService.exportCsv.mockResolvedValue('id,duration\n1,300')
    const res: { setHeader: jest.Mock; send: jest.Mock } = {
      setHeader: jest.fn(),
      send: jest.fn(),
    }

    await controller.exportCsv(res as never, user)

    expect(callRecordService.exportCsv).toHaveBeenCalledWith(user)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8')
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename=call-records.csv',
    )
    expect(res.send).toHaveBeenCalledWith('id,duration\n1,300')
  })

  it('getStats should delegate to service', async () => {
    callRecordService.getStats.mockResolvedValue({ totalCalls: 8 })

    const result = await controller.getStats(user)

    expect(callRecordService.getStats).toHaveBeenCalledWith(user)
    expect(result).toEqual({ totalCalls: 8 })
  })

  it('findOne should delegate to service', async () => {
    callRecordService.findOne.mockResolvedValue({ id: 1 })

    const result = await controller.findOne(1, user)

    expect(callRecordService.findOne).toHaveBeenCalledWith(1, user)
    expect(result).toEqual({ id: 1 })
  })

  it('update should delegate to service', async () => {
    const dto = { notes: 'updated notes' }
    callRecordService.update.mockResolvedValue({ id: 2, notes: 'updated notes' })

    const result = await controller.update(2, dto as never, user)

    expect(callRecordService.update).toHaveBeenCalledWith(2, dto, user)
    expect(result).toEqual({ id: 2, notes: 'updated notes' })
  })

  it('remove should delete and send notification', async () => {
    callRecordService.remove.mockResolvedValue(undefined)

    const result = await controller.remove(9, user)

    expect(callRecordService.remove).toHaveBeenCalledWith(9)
    expect(notificationService.callRecordDeleted).toHaveBeenCalledWith(2, 'sales-b', 9)
    expect(result).toBeNull()
  })

  it('summarize should delegate to service', async () => {
    callRecordService.summarize.mockResolvedValue({ jobId: 'job-1' })

    const result = await controller.summarize(12, user)

    expect(callRecordService.summarize).toHaveBeenCalledWith(12, user)
    expect(result).toEqual({ jobId: 'job-1' })
  })
})
