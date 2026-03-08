import { ExecutionContext, Logger } from '@nestjs/common'
import { of, lastValueFrom } from 'rxjs'
import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor'

describe('LoggingInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should log request method, url and elapsed time', async () => {
    const interceptor = new LoggingInterceptor()
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1123)

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/api/v1/customers' }),
      }),
    } as unknown as ExecutionContext
    const next = {
      handle: jest.fn(() => of({ ok: true })),
    }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toEqual({ ok: true })
    expect(logSpy).toHaveBeenCalledTimes(1)
    const message = logSpy.mock.calls[0][0] as string
    expect(message).toContain('GET /api/v1/customers')
    expect(message).toContain('123ms')
  })
})
