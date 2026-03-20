import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response, NextFunction } from 'express'
import * as crypto from 'crypto'

@Injectable()
export class WebhookSignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WebhookSignatureMiddleware.name)

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const signature = req.headers['x-cloud-call-signature'] as string | undefined
    const secret = this.configService.get<string>('CLOUD_CALL_WEBHOOK_SECRET', '')

    if (!secret) {
      const skipVerify = this.configService.get<string>('CLOUD_CALL_WEBHOOK_SKIP_VERIFY', 'false')
      if (skipVerify === 'true') {
        this.logger.warn(
          'CLOUD_CALL_WEBHOOK_SKIP_VERIFY=true — skipping signature verification (dev only)',
        )
        next()
        return
      }
      throw new ForbiddenException('CLOUD_CALL_WEBHOOK_SECRET not configured')
    }

    if (!signature) {
      throw new ForbiddenException('Missing webhook signature')
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex')

    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSignature, 'hex')

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      this.logger.warn('Webhook signature verification failed')
      throw new ForbiddenException('Invalid webhook signature')
    }

    next()
  }
}
