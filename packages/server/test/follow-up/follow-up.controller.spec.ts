import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UserRole } from '@crm/shared'
import { FollowUpController } from '../../src/modules/follow-up/follow-up.controller'
import { FollowUpService } from '../../src/modules/follow-up/follow-up.service'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'
import { FollowUpType } from '../../src/modules/follow-up/follow-up.entity'

describe('FollowUpController', () => {
  let controller: FollowUpController
  let followUpService: {
    create: jest.Mock
    findByCustomer: jest.Mock
    update: jest.Mock
    remove: jest.Mock
  }

  const adminUser = {
    id: 1,
    username: 'admin',
    role: UserRole.ADMIN,
  } as never

  beforeEach(async () => {
    followUpService = {
      create: jest.fn(),
      findByCustomer: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowUpController],
      providers: [
        { provide: FollowUpService, useValue: followUpService },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile()

    controller = module.get<FollowUpController>(FollowUpController)
  })

  it('create should pass full user to service', async () => {
    const dto = { customerId: 10, type: FollowUpType.CALL, content: 'follow-up' }
    followUpService.create.mockResolvedValue({ id: 5, ...dto, userId: 1 })

    const result = await controller.create(dto as never, adminUser)

    expect(followUpService.create).toHaveBeenCalledWith(dto, adminUser)
    expect(result.id).toBe(5)
  })

  it('findAll should throw when customerId is missing', async () => {
    await expect(controller.findAll({} as never, adminUser)).rejects.toBeInstanceOf(BadRequestException)
    expect(followUpService.findByCustomer).not.toHaveBeenCalled()
  })

  it('findAll should return paginated response with defaults', async () => {
    followUpService.findByCustomer.mockResolvedValue({
      list: [{ id: 1, content: 'A' }],
      total: 1,
    })

    const result = await controller.findAll({ customerId: 10 } as never, adminUser)

    expect(followUpService.findByCustomer).toHaveBeenCalledWith(10, { customerId: 10 }, adminUser)
    expect(result).toEqual({
      list: [{ id: 1, content: 'A' }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })

  it('findAll should preserve page/pageSize from query', async () => {
    const query = { customerId: 10, page: 2, pageSize: 5, type: FollowUpType.CALL }
    followUpService.findByCustomer.mockResolvedValue({
      list: [],
      total: 0,
    })

    const result = await controller.findAll(query as never, adminUser)

    expect(followUpService.findByCustomer).toHaveBeenCalledWith(10, query, adminUser)
    expect(result).toEqual({
      list: [],
      total: 0,
      page: 2,
      pageSize: 5,
    })
  })

  it('update should delegate to service', async () => {
    followUpService.update.mockResolvedValue({ id: 3, content: 'updated' })

    const result = await controller.update(3, { content: 'updated' } as never, adminUser)

    expect(followUpService.update).toHaveBeenCalledWith(3, { content: 'updated' }, adminUser)
    expect(result).toEqual({ id: 3, content: 'updated' })
  })

  it('remove should delegate to service and return null', async () => {
    followUpService.remove.mockResolvedValue(undefined)

    const result = await controller.remove(3, adminUser)

    expect(followUpService.remove).toHaveBeenCalledWith(3, adminUser)
    expect(result).toBeNull()
  })
})
