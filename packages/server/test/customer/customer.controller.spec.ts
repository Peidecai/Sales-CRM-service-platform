import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UserRole } from '@crm/shared'
import { CustomerController } from '../../src/modules/customer/customer.controller'
import { CustomerService } from '../../src/modules/customer/customer.service'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'

describe('CustomerController', () => {
  let controller: CustomerController
  let customerService: {
    findAll: jest.Mock
    exportCsv: jest.Mock
    importFromCsvRows: jest.Mock
    create: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    allocate: jest.Mock
    remove: jest.Mock
  }
  let notificationService: {
    customerCreated: jest.Mock
    customerUpdated: jest.Mock
    customerDeleted: jest.Mock
  }

  const user = {
    id: 1,
    username: 'sales-a',
    role: UserRole.SALES,
  } as never

  beforeEach(async () => {
    customerService = {
      findAll: jest.fn(),
      exportCsv: jest.fn(),
      importFromCsvRows: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      allocate: jest.fn(),
      remove: jest.fn(),
    }
    notificationService = {
      customerCreated: jest.fn(),
      customerUpdated: jest.fn(),
      customerDeleted: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        { provide: CustomerService, useValue: customerService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile()

    controller = module.get<CustomerController>(CustomerController)
  })

  it('findAll should return paginated response with defaults', async () => {
    customerService.findAll.mockResolvedValue({
      list: [{ id: 1, name: 'Acme' }],
      total: 1,
    })

    const result = await controller.findAll({}, user)

    expect(customerService.findAll).toHaveBeenCalledWith({}, user)
    expect(result).toEqual({
      list: [{ id: 1, name: 'Acme' }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })

  it('findAll should keep provided page and pageSize', async () => {
    const query = { page: 2, pageSize: 50 }
    customerService.findAll.mockResolvedValue({ list: [], total: 0 })

    const result = await controller.findAll(query, user)

    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(50)
  })

  it('exportCsv should set headers and send CSV content', async () => {
    customerService.exportCsv.mockResolvedValue('id,name\n1,Acme')
    const res: { setHeader: jest.Mock; send: jest.Mock } = {
      setHeader: jest.fn(),
      send: jest.fn(),
    }

    await controller.exportCsv(res as never, user)

    expect(customerService.exportCsv).toHaveBeenCalledWith(user)
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8')
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename=customers.csv',
    )
    expect(res.send).toHaveBeenCalledWith('id,name\n1,Acme')
  })

  it('importCsv should reject invalid rows payload', async () => {
    await expect(controller.importCsv({ rows: [] }, user)).rejects.toBeInstanceOf(BadRequestException)
    expect(customerService.importFromCsvRows).not.toHaveBeenCalled()
  })

  it('importCsv should reject too many rows', async () => {
    const rows = new Array(1001).fill({ name: 'X' })

    await expect(controller.importCsv({ rows }, user)).rejects.toBeInstanceOf(BadRequestException)
    expect(customerService.importFromCsvRows).not.toHaveBeenCalled()
  })

  it('importCsv should call service for valid rows', async () => {
    const rows = [{ name: 'Acme' }]
    customerService.importFromCsvRows.mockResolvedValue({ imported: 1, errors: [] })

    const result = await controller.importCsv({ rows }, user)

    expect(customerService.importFromCsvRows).toHaveBeenCalledWith(rows, 1)
    expect(result).toEqual({ imported: 1, errors: [] })
  })

  it('create should notify after creating customer', async () => {
    const dto = { name: 'Acme', phone: '13800138000' }
    const created = { id: 99, name: 'Acme' }
    customerService.create.mockResolvedValue(created)

    const result = await controller.create(dto as never, user)

    expect(customerService.create).toHaveBeenCalledWith(dto)
    expect(notificationService.customerCreated).toHaveBeenCalledWith(1, 'sales-a', 99, 'Acme')
    expect(result).toBe(created)
  })

  it('findOne should delegate to service', async () => {
    customerService.findOne.mockResolvedValue({ id: 7 })

    const result = await controller.findOne(7, user)

    expect(customerService.findOne).toHaveBeenCalledWith(7, user)
    expect(result).toEqual({ id: 7 })
  })

  it('update should delegate to service', async () => {
    const dto = { company: 'Acme Co.' }
    customerService.update.mockResolvedValue({ id: 7, name: 'Acme', company: 'Acme Co.' })

    const result = await controller.update(7, dto as never, user)

    expect(customerService.update).toHaveBeenCalledWith(7, dto, user)
    expect(notificationService.customerUpdated).toHaveBeenCalledWith(1, 'sales-a', 7, 'Acme')
    expect(result).toEqual({ id: 7, name: 'Acme', company: 'Acme Co.' })
  })

  it('allocate should delegate to service and notify', async () => {
    const dto = { assignedUserId: 9 }
    customerService.allocate.mockResolvedValue({ id: 7, name: 'Acme', assignedUserId: 9 })

    const result = await controller.allocate(7, dto as never, user)

    expect(customerService.allocate).toHaveBeenCalledWith(7, dto)
    expect(notificationService.customerUpdated).toHaveBeenCalledWith(1, 'sales-a', 7, 'Acme')
    expect(result).toEqual({ id: 7, name: 'Acme', assignedUserId: 9 })
  })

  it('remove should delete and send notification', async () => {
    customerService.remove.mockResolvedValue(undefined)

    const result = await controller.remove(5, user)

    expect(customerService.remove).toHaveBeenCalledWith(5)
    expect(notificationService.customerDeleted).toHaveBeenCalledWith(1, 'sales-a', 5)
    expect(result).toBeNull()
  })
})
