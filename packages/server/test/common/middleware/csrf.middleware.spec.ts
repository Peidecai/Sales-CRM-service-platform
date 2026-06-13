import { ForbiddenException } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { CsrfMiddleware } from '../../../src/common/middleware/csrf.middleware'

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware
  let next: jest.MockedFunction<NextFunction>
  let originalApiPrefix: string | undefined

  beforeEach(() => {
    middleware = new CsrfMiddleware()
    next = jest.fn()
    originalApiPrefix = process.env.API_PREFIX
  })

  afterEach(() => {
    if (originalApiPrefix === undefined) {
      delete process.env.API_PREFIX
    } else {
      process.env.API_PREFIX = originalApiPrefix
    }
  })

  it('should exempt cloud transcription callback when API_PREFIX has no leading slash', () => {
    process.env.API_PREFIX = 'api/v1'
    const req = makeRequest('/api/v1/recordings/transcription/callback', {
      cookies: {},
      headers: {},
    })
    const res = makeResponse()

    expect(() => middleware.use(req, res, next)).not.toThrow()
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.cookie).toHaveBeenCalledWith('XSRF-TOKEN', expect.any(String), expect.any(Object))
  })

  it('should still reject normal mutating browser requests without matching token', () => {
    process.env.API_PREFIX = 'api/v1'
    const req = makeRequest('/api/v1/customers', {
      cookies: { SESSION: 'session-id' },
      headers: {},
    })

    expect(() => middleware.use(req, makeResponse(), next)).toThrow(ForbiddenException)
    expect(next).not.toHaveBeenCalled()
  })

  function makeRequest(
    path: string,
    options: { cookies: Record<string, string>; headers: Record<string, string> },
  ): Request {
    return {
      method: 'POST',
      path,
      originalUrl: path,
      cookies: options.cookies,
      headers: options.headers,
    } as unknown as Request
  }

  function makeResponse(): Response {
    return {
      cookie: jest.fn(),
    } as unknown as Response
  }
})
