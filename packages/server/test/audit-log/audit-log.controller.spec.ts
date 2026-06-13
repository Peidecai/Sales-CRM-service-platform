import { Test, TestingModule } from '@nestjs/testing'
import { AuditLogController } from '../../src/modules/audit-log/audit-log.controller'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'

describe('AuditLogController', () => {
  let controller: AuditLogController
  let auditLogService: { findAll: jest.Mock }

  beforeEach(async () => {
    auditLogService = {
      findAll: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: auditLogService }],
    }).compile()

    controller = module.get<AuditLogController>(AuditLogController)
  })

  it('findAll should delegate to service with query dto', async () => {
    const query = { page: 1, pageSize: 20, resource: 'customer' }
    const pageData = { list: [{ id: 1 }], total: 1, page: 1, pageSize: 20 }
    auditLogService.findAll.mockResolvedValue(pageData)

    const result = await controller.findAll(query as never)

    expect(auditLogService.findAll).toHaveBeenCalledWith(query)
    expect(result).toBe(pageData)
  })
})
