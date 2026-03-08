import { ExecutionContext } from '@nestjs/common'
import { of, lastValueFrom } from 'rxjs'
import { ResponseInterceptor } from '../../../src/common/interceptors/response.interceptor'

describe('ResponseInterceptor', () => {
  const context = {} as ExecutionContext

  it('should wrap plain data with standard response shape', async () => {
    const interceptor = new ResponseInterceptor<string>()
    const next = {
      handle: jest.fn(() => of('ok')),
    }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toEqual({
      code: 0,
      message: 'success',
      data: 'ok',
    })
  })

  it('should not double wrap preformatted response data', async () => {
    const interceptor = new ResponseInterceptor<{ id: number }>()
    const data = {
      code: 0,
      message: 'already wrapped',
      data: { id: 7 },
    }
    const next = {
      handle: jest.fn(() => of(data)),
    }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toBe(data)
  })

  it('should still wrap null payloads', async () => {
    const interceptor = new ResponseInterceptor<null>()
    const next = {
      handle: jest.fn(() => of(null)),
    }

    const result = await lastValueFrom(interceptor.intercept(context, next))

    expect(result).toEqual({
      code: 0,
      message: 'success',
      data: null,
    })
  })
})
