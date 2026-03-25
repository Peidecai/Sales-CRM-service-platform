import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import type { Request } from 'express'

/**
 * 校验厂商回调签名（如阿里云语音/OSS/讯飞）。
 * 从 header 或 body 取签名，使用配置的 AppSecret 做 HMAC-SHA256 校验。
 */
@Injectable()
export class CallbackSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  private static readonly TIMESTAMP_WINDOW = 300 // 5 minutes

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const secret = this.configService.get<string>('ALIYUN_VOICE_APP_SECRET', '')
    if (!secret) {
      throw new ForbiddenException('Callback signature not configured')
    }

    // Replay-window: reject requests outside ±5 min tolerance
    const timestampStr = this.extractField(request, 'timestamp')
    if (timestampStr) {
      const ts = parseInt(timestampStr, 10)
      const now = Math.floor(Date.now() / 1000)
      if (isNaN(ts) || Math.abs(now - ts) > CallbackSignatureGuard.TIMESTAMP_WINDOW) {
        throw new ForbiddenException('Callback request timestamp expired')
      }
    }

    const signature = this.getSignature(request)
    if (!signature) {
      throw new ForbiddenException('Missing callback signature')
    }

    const payload = this.getBodyForSignature(request)
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    // Constant-time comparison (prevent timing attacks)
    const sigBuf = Buffer.from(signature.toLowerCase(), 'utf8')
    const expBuf = Buffer.from(expected.toLowerCase(), 'utf8')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new ForbiddenException('Invalid callback signature')
    }
    return true
  }

  private getSignature(req: Request): string | null {
    const fromHeader = req.headers['x-signature'] ?? req.headers['x-callback-signature']
    if (typeof fromHeader === 'string') return fromHeader
    const body = req.body as Record<string, unknown>
    if (body?.signature && typeof body.signature === 'string') return body.signature
    return null
  }

  private extractField(req: Request, field: string): string | null {
    const header = req.headers[`x-${field}`]
    if (typeof header === 'string') return header
    const body = req.body as Record<string, unknown> | undefined
    if (body && typeof body[field] === 'string') return body[field] as string
    return null
  }

  private getBodyForSignature(req: Request): string {
    const body = req.body
    if (!body || typeof body !== 'object') return ''
    const keys = Object.keys(body)
      .filter((k) => k !== 'signature')
      .sort()
    return keys.map((k) => `${k}=${body[k]}`).join('&')
  }
}
