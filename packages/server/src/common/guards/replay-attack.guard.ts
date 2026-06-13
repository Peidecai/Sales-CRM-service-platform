import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import type { Request } from 'express'
import { RedisService } from '../redis'

const NONCE_TTL = 300 // 5 minutes
const TIMESTAMP_WINDOW = 300 // 5 minutes
const NONCE_KEY_PREFIX = 'nonce'

/**
 * Anti-replay attack guard using nonce + timestamp.
 *
 * Requires request to include:
 *   Header or body `nonce` — a unique random string per request
 *   Header or body `timestamp` — Unix epoch seconds
 *
 * Checks:
 *   1. Timestamp within 5 minutes of server time
 *   2. Nonce has not been seen before (stored in Redis for 5 min)
 *
 * Apply to open APIs or sensitive operations with @UseGuards(ReplayAttackGuard).
 */
@Injectable()
export class ReplayAttackGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    const nonce = this.extract(request, 'nonce')
    const timestampStr = this.extract(request, 'timestamp')

    if (!nonce || !timestampStr) {
      throw new ForbiddenException('Missing nonce or timestamp')
    }

    // Validate timestamp freshness
    const timestamp = parseInt(timestampStr, 10)
    const now = Math.floor(Date.now() / 1000)
    if (isNaN(timestamp) || Math.abs(now - timestamp) > TIMESTAMP_WINDOW) {
      throw new ForbiddenException('Request timestamp expired or invalid')
    }

    // Check nonce uniqueness
    const nonceKey = `${NONCE_KEY_PREFIX}:${nonce}`
    const exists = await this.redisService.exists(nonceKey)
    if (exists) {
      throw new ForbiddenException('Duplicate request (nonce already used)')
    }

    // nonce 的 TTL 与时间窗口保持一致，超过窗口的请求即使重放也会先被时间校验拦截。
    await this.redisService.set(nonceKey, '1', NONCE_TTL)

    return true
  }

  private extract(req: Request, field: string): string | null {
    // Check headers first
    const header = req.headers[`x-${field}`]
    if (typeof header === 'string') return header

    // Then body
    const body = req.body as Record<string, unknown> | undefined
    if (body && typeof body[field] === 'string') return body[field] as string

    return null
  }
}
