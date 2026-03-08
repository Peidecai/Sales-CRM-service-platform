import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter'

describe('HttpExceptionFilter', () => {
  const createHost = () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    const request = {
      method: 'GET',
      url: '/api/v1/test',
    }

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as never

    return { host, response }
  }

  it('should map validation error array to business code 40001 and include errors', () => {
    const filter = new HttpExceptionFilter()
    const { host, response } = createHost()
    const ex = new BadRequestException({ message: ['name is required', 'email invalid'] })

    filter.catch(ex, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    const payload = response.json.mock.calls[0][0]
    expect(payload.code).toBe(40001)
    expect(payload.errors).toEqual(['name is required', 'email invalid'])
    expect(payload.message).toContain('name is required')
  })

  it('should refine unauthorized "expired" message to code 40102', () => {
    const filter = new HttpExceptionFilter()
    const { host, response } = createHost()
    const ex = new UnauthorizedException('token expired')

    filter.catch(ex, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    const payload = response.json.mock.calls[0][0]
    expect(payload.code).toBe(40102)
  })

  it('should map forbidden to code 40301', () => {
    const filter = new HttpExceptionFilter()
    const { host, response } = createHost()
    const ex = new ForbiddenException('forbidden')

    filter.catch(ex, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
    const payload = response.json.mock.calls[0][0]
    expect(payload.code).toBe(40301)
  })

  it('should handle string responses and fallback to status code for unmapped status', () => {
    const filter = new HttpExceptionFilter()
    const { host, response } = createHost()
    const ex = new HttpException('teapot error', 418)

    filter.catch(ex, host)

    expect(response.status).toHaveBeenCalledWith(418)
    const payload = response.json.mock.calls[0][0]
    expect(payload.code).toBe(418)
    expect(payload.message).toBe('teapot error')
  })

  it('should fallback to default message when object response has empty message', () => {
    const filter = new HttpExceptionFilter()
    const { host, response } = createHost()
    const ex = new HttpException({ message: '' }, HttpStatus.BAD_REQUEST)

    filter.catch(ex, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    const payload = response.json.mock.calls[0][0]
    expect(payload.code).toBe(40001)
    expect(payload.message).not.toBe('')
  })

  it('should handle unexpected errors as 50001', () => {
    const filter = new HttpExceptionFilter()
    const { host, response } = createHost()
    const ex = new Error('boom')

    filter.catch(ex, host)

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    const payload = response.json.mock.calls[0][0]
    expect(payload.code).toBe(50001)
    expect(payload.data).toBeNull()
    expect(typeof payload.timestamp).toBe('string')
  })
})
