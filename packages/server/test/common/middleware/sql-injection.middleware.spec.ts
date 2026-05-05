import { BadRequestException } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { SqlInjectionMiddleware } from '../../../src/common/middleware/sql-injection.middleware'

describe('SqlInjectionMiddleware', () => {
  let middleware: SqlInjectionMiddleware
  let next: jest.MockedFunction<NextFunction>

  beforeEach(() => {
    middleware = new SqlInjectionMiddleware()
    next = jest.fn()
  })

  it('should not inspect signed cloud transcription callback text', () => {
    const req = makeRequest('/api/v1/recordings/transcription/callback', {
      result: [{ text: 'customer said: DROP TABLE is written in the contract' }],
    })

    expect(() => middleware.use(req, {} as Response, next)).not.toThrow()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should still reject suspicious text on normal API paths', () => {
    const req = makeRequest('/api/v1/customers', {
      keyword: 'DROP TABLE customers',
    })

    expect(() => middleware.use(req, {} as Response, next)).toThrow(BadRequestException)
    expect(next).not.toHaveBeenCalled()
  })

  function makeRequest(path: string, body: Record<string, unknown>): Request {
    return {
      method: 'POST',
      path,
      originalUrl: path,
      query: {},
      params: {},
      body,
      ip: '127.0.0.1',
    } as unknown as Request
  }
})
