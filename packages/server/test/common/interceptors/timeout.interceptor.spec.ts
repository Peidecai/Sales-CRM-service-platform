import { ExecutionContext, RequestTimeoutException } from '@nestjs/common'
import { of, throwError, timer, lastValueFrom } from 'rxjs'
import { mapTo } from 'rxjs/operators'
import { TimeoutInterceptor } from '../../../src/common/interceptors/timeout.interceptor'

describe('TimeoutInterceptor', () => {
  const context = {} as ExecutionContext

  it('should support constructor default timeout value', async () => {
    const interceptor = new TimeoutInterceptor()
    const next = {
      handle: jest.fn(() => of('default-timeout-response')),
    }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toBe('default-timeout-response')
  })

  it('should pass through response within timeout', async () => {
    const interceptor = new TimeoutInterceptor(50)
    const next = {
      handle: jest.fn(() => of('fast-response')),
    }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toBe('fast-response')
  })

  it('should convert TimeoutError into RequestTimeoutException', async () => {
    const interceptor = new TimeoutInterceptor(10)
    const next = {
      handle: jest.fn(() => timer(30).pipe(mapTo('too-late'))),
    }

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBeInstanceOf(
      RequestTimeoutException,
    )
  })

  it('should propagate non-timeout errors', async () => {
    const interceptor = new TimeoutInterceptor(50)
    const error = new Error('boom')
    const next = {
      handle: jest.fn(() => throwError(() => error)),
    }

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(error)
  })
})
