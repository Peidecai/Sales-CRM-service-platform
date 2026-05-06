import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/**
 * SQL injection detection patterns.
 * Detects common attack vectors while avoiding false positives on normal text.
 */
const SQL_PATTERNS: RegExp[] = [
  /(\b(UNION)\b\s+(ALL\s+)?SELECT\b)/i,
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b\s+(INTO|FROM|TABLE|DATABASE)\b)/i,
  /(;\s*(DROP|DELETE|TRUNCATE|ALTER)\b)/i,
  /(\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/i, // OR '1'='1'
  /(\bAND\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/i, // AND 1=1
  /(--|\/\*|\*\/|;--)/, // SQL comments
  /(\b(EXEC|EXECUTE)\b\s*\()/i,
  /(\bxp_\w+)/i, // SQL Server extended procedures
  /(\bWAITFOR\b\s+\bDELAY\b)/i, // Time-based blind SQL injection
  /(\bBENCHMARK\s*\()/i, // MySQL benchmark
  /(\bSLEEP\s*\()/i, // MySQL sleep
  /(\bLOAD_FILE\s*\()/i,
  /(\bINTO\s+(OUT|DUMP)FILE\b)/i,
]

/** Paths excluded from SQL injection checks (e.g. rich text content) */
const EXCLUDED_PATHS = [
  '/knowledge/articles',
  '/announcements',
  '/recordings/transcription/callback',
]

@Injectable()
export class SqlInjectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SqlInjectionMiddleware.name)

  use(req: Request, _res: Response, next: NextFunction): void {
    const requestPath = this.getPathWithoutApiPrefix(req)

    // Skip excluded paths (rich text / signed third-party text payloads)
    if (EXCLUDED_PATHS.some((p) => requestPath.startsWith(p)) && req.method !== 'GET') {
      return next()
    }

    // 这是入口层的兜底拦截，不能替代 Repository/QueryBuilder 的参数化查询。
    const suspicious =
      this.checkParams(req.query as Record<string, unknown>) ||
      this.checkParams(req.params as Record<string, unknown>) ||
      this.checkParams(req.body as Record<string, unknown>)

    if (suspicious) {
      this.logger.warn(
        `SQL injection attempt detected: ${req.method} ${req.originalUrl} from ${req.ip}`,
      )
      throw new BadRequestException('请求参数包含非法字符')
    }

    next()
  }

  private checkParams(params: unknown): boolean {
    if (!params || typeof params !== 'object') return false

    for (const value of Object.values(params as Record<string, unknown>)) {
      if (typeof value === 'string' && this.isSuspicious(value)) {
        return true
      }
      if (typeof value === 'object' && value !== null && this.checkParams(value)) {
        return true
      }
    }
    return false
  }

  private isSuspicious(value: string): boolean {
    return SQL_PATTERNS.some((pattern) => pattern.test(value))
  }

  private getPathWithoutApiPrefix(req: Request): string {
    const path = req.path || req.originalUrl.split('?')[0]
    const configuredPrefix = process.env.API_PREFIX || '/api/v1'
    const apiPrefix = configuredPrefix.startsWith('/') ? configuredPrefix : `/${configuredPrefix}`
    return path.startsWith(apiPrefix) ? path.slice(apiPrefix.length) || '/' : path
  }
}
