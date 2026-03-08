import { ExecutionContext } from '@nestjs/common'
import { of, lastValueFrom } from 'rxjs'
import { AuditLogInterceptor } from '../../../src/common/interceptors/audit-log.interceptor'
import { AuditAction } from '../../../src/modules/audit-log/audit-log.entity'

describe('AuditLogInterceptor', () => {
  const createContext = (request: Record<string, unknown>, controllerName = 'CustomerController') =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getClass: () => ({ name: controllerName }),
    }) as unknown as ExecutionContext

  it('should bypass audit for read-only methods', async () => {
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) }
    const interceptor = new AuditLogInterceptor(auditLogService as never)
    const context = createContext({ method: 'GET', user: { id: 1, username: 'admin' } })
    const next = { handle: jest.fn(() => of({ id: 1 })) }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toEqual({ id: 1 })
    expect(next.handle).toHaveBeenCalled()
    expect(auditLogService.log).not.toHaveBeenCalled()
  })

  it('should bypass audit when user is missing', async () => {
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) }
    const interceptor = new AuditLogInterceptor(auditLogService as never)
    const context = createContext({ method: 'POST' })
    const next = { handle: jest.fn(() => of({ id: 2 })) }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toEqual({ id: 2 })
    expect(auditLogService.log).not.toHaveBeenCalled()
  })

  it('should write audit log for POST and extract resourceId from route params', async () => {
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) }
    const interceptor = new AuditLogInterceptor(auditLogService as never)
    const context = createContext({
      method: 'POST',
      user: { id: 3, username: 'manager' },
      params: { id: '42' },
      ip: '127.0.0.1',
      headers: {},
    })
    const next = { handle: jest.fn(() => of({ id: 100, name: 'Acme' })) }

    const result = await lastValueFrom(interceptor.intercept(context, next))
    await Promise.resolve()

    expect(result).toEqual({ id: 100, name: 'Acme' })
    expect(auditLogService.log).toHaveBeenCalledWith({
      userId: 3,
      username: 'manager',
      action: AuditAction.CREATE,
      resource: 'customer',
      resourceId: 42,
      after: { id: 100, name: 'Acme' },
      ip: '127.0.0.1',
    })
  })

  it('should use response id when route params id is absent', async () => {
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) }
    const interceptor = new AuditLogInterceptor(auditLogService as never)
    const context = createContext({
      method: 'PATCH',
      user: { id: 9, username: 'sales' },
      params: {},
      ip: '',
      headers: { 'x-forwarded-for': '10.0.0.1' },
    }, 'OpportunityController')
    const next = { handle: jest.fn(() => of({ id: 88, stage: 'proposal' })) }

    const result = await lastValueFrom(interceptor.intercept(context, next))
    await Promise.resolve()

    expect(result).toEqual({ id: 88, stage: 'proposal' })
    expect(auditLogService.log).toHaveBeenCalledWith({
      userId: 9,
      username: 'sales',
      action: AuditAction.UPDATE,
      resource: 'opportunity',
      resourceId: 88,
      after: { id: 88, stage: 'proposal' },
      ip: '10.0.0.1',
    })
  })

  it('should set after to null for DELETE and swallow audit errors', async () => {
    const auditLogService = { log: jest.fn().mockRejectedValue(new Error('audit failed')) }
    const interceptor = new AuditLogInterceptor(auditLogService as never)
    const context = createContext({
      method: 'DELETE',
      user: { id: 11, username: 'admin' },
      params: { id: '77' },
      ip: '127.0.0.1',
      headers: {},
    }, 'UserController')
    const next = { handle: jest.fn(() => of({ ok: true })) }

    const result = await lastValueFrom(interceptor.intercept(context, next))
    await Promise.resolve()

    expect(result).toEqual({ ok: true })
    expect(auditLogService.log).toHaveBeenCalledWith({
      userId: 11,
      username: 'admin',
      action: AuditAction.DELETE,
      resource: 'user',
      resourceId: 77,
      after: null,
      ip: '127.0.0.1',
    })
  })

  it('should fallback ip to empty string and map null response body to after=null for write actions', async () => {
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) }
    const interceptor = new AuditLogInterceptor(auditLogService as never)
    const context = createContext(
      {
        method: 'PUT',
        user: { id: 21, username: 'owner' },
        params: { id: '15' },
        headers: {},
      },
      'LeadController',
    )
    const next = { handle: jest.fn(() => of(null)) }

    const result = await lastValueFrom(interceptor.intercept(context, next))
    await Promise.resolve()

    expect(result).toBeNull()
    expect(auditLogService.log).toHaveBeenCalledWith({
      userId: 21,
      username: 'owner',
      action: AuditAction.UPDATE,
      resource: 'lead',
      resourceId: 15,
      after: null,
      ip: '',
    })
  })
})
