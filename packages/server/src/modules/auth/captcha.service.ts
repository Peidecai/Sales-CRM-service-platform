import { Injectable } from '@nestjs/common'
import { RedisService } from '../../common/redis'

const CAPTCHA_KEY_PREFIX = 'captcha'

@Injectable()
export class CaptchaService {
  constructor(private readonly redisService: RedisService) {}

  /** Store captcha text in Redis with TTL */
  async store(captchaId: string, text: string, ttlSeconds: number = 300): Promise<void> {
    await this.redisService.set(`${CAPTCHA_KEY_PREFIX}:${captchaId}`, text, ttlSeconds)
  }

  /** Verify a captcha code (case-insensitive, one-time use) */
  async verify(captchaId: string, code: string): Promise<boolean> {
    const key = `${CAPTCHA_KEY_PREFIX}:${captchaId}`
    const stored = await this.redisService.get(key)
    if (!stored) return false
    await this.redisService.del(key) // one-time use
    return stored.toLowerCase() === code.toLowerCase()
  }
}
