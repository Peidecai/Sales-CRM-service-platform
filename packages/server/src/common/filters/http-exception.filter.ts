import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

/**
 * Error code mapping per CLAUDE.md conventions:
 * - 0      : Success
 * - 40001  : Bad request / validation error
 * - 40101  : Invalid credentials
 * - 40102  : Token expired
 * - 40103  : Account disabled
 * - 40301  : Forbidden / insufficient permissions
 * - 40401  : Resource not found
 * - 40901  : Conflict (e.g., duplicate resource)
 * - 50001  : Internal server error
 */
const ERROR_CODE_MAP: Record<number, number> = {
  [HttpStatus.BAD_REQUEST]: 40001,
  [HttpStatus.UNAUTHORIZED]: 40101,
  [HttpStatus.FORBIDDEN]: 40301,
  [HttpStatus.NOT_FOUND]: 40401,
  [HttpStatus.CONFLICT]: 40901,
  [HttpStatus.UNPROCESSABLE_ENTITY]: 40001,
  [HttpStatus.TOO_MANY_REQUESTS]: 42901,
  [HttpStatus.INTERNAL_SERVER_ERROR]: 50001,
  [HttpStatus.SERVICE_UNAVAILABLE]: 50003,
}

/** Keywords in error messages used to refine the error code */
const UNAUTHORIZED_REFINEMENTS: Array<{ pattern: RegExp; code: number }> = [
  { pattern: /expired/i, code: 40102 },
  { pattern: /disabled|禁用/i, code: 40103 },
]

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = '服务器内部错误'
    let validationErrors: string[] | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>
        if (Array.isArray(resp.message)) {
          validationErrors = resp.message as string[]
          message = validationErrors.join('; ')
        } else {
          message = (resp.message as string) || message
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack)
    }

    // Map HTTP status to business error code
    let code = ERROR_CODE_MAP[status] ?? status

    // Refine 401 error codes based on message content
    if (status === HttpStatus.UNAUTHORIZED) {
      for (const refinement of UNAUTHORIZED_REFINEMENTS) {
        if (refinement.pattern.test(message)) {
          code = refinement.code
          break
        }
      }
    }

    this.logger.warn(`[${request.method}] ${request.url} → ${status} (code: ${code}): ${message}`)

    response.status(status).json({
      code,
      message,
      data: null,
      ...(validationErrors ? { errors: validationErrors } : {}),
      timestamp: new Date().toISOString(),
    })
  }
}
