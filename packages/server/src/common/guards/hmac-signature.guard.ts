import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import type { Request } from 'express'

/**
 * Generic HMAC-SHA256 signature verification guard for third-party callbacks.
 *
 * Expected headers:
 *   X-Signature: hex HMAC-SHA256 of the sorted query/body
 *   X-Timestamp: Unix epoch seconds (optional, for freshness check)
 *
 * Or body fields: signature, timestamp.
 *
 * Secret is read from HMAC_CALLBACK_SECRET env var.
 * Use @UseGuards(HmacSignatureGuard) on callback endpoints — do NOT combine with JwtAuthGuard.
 */
@Injectable()
export class HmacSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const secret = this.configService.get<string>('HMAC_CALLBACK_SECRET', '')

    if (!secret) {
      throw new ForbiddenException('HMAC callback secret not configured')
    }

    // Extract signature
    const signature =
      this.extractHeader(request, 'x-signature') || this.extractBody(request, 'signature')
    if (!signature) {
      throw new ForbiddenException('Missing request signature')
    }

    // Optional timestamp freshness (5 minute window)
    const timestampStr =
      this.extractHeader(request, 'x-timestamp') || this.extractBody(request, 'timestamp')
    if (timestampStr) {
      const ts = parseInt(String(timestampStr), 10)
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - ts) > 300) {
        throw new ForbiddenException('Request timestamp expired')
      }
    }

    // Compute expected signature
    const payload = this.buildSignaturePayload(request)
    const expected = createHmac('sha256', secret).update(payload).digest('hex')

    // Constant-time comparison
    const sigBuf = Buffer.from(signature.toLowerCase(), 'utf8')
    const expBuf = Buffer.from(expected.toLowerCase(), 'utf8')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new ForbiddenException('Invalid request signature')
    }

    return true
  }

  private extractHeader(req: Request, name: string): string | null {
    const val = req.headers[name]
    return typeof val === 'string' ? val : null
  }

  private extractBody(req: Request, field: string): string | null {
    const body = req.body as Record<string, unknown> | undefined
    if (body && typeof body[field] === 'string') return body[field] as string
    return null
  }

  private buildSignaturePayload(req: Request): string {
    const body = req.body as Record<string, unknown> | undefined
    if (!body || typeof body !== 'object') return ''

    const keys = Object.keys(body)
      .filter((k) => k !== 'signature')
      .sort()

    return keys.map((k) => `${k}=${String(body[k])}`).join('&')
  }
}
