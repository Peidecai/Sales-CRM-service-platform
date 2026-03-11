import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * Enhanced throttler guard that keys rate limits by:
 *   - Authenticated user ID (per-user: 30/min)
 *   - IP address for unauthenticated requests
 *
 * Per-route overrides via @Throttle decorator:
 *   - Login:     @Throttle({ default: { limit: 5,  ttl: 60000 } })
 *   - Export:    @Throttle({ default: { limit: 3,  ttl: 60000 } })
 *   - SMS/Code:  @Throttle({ default: { limit: 1,  ttl: 60000 } })
 *   - Refresh:   @Throttle({ default: { limit: 10, ttl: 60000 } })
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Use userId if authenticated, otherwise IP
    const user = req.user as { id: number } | undefined
    if (user?.id) {
      return `user:${user.id}`
    }
    return (req.ip as string) || 'anonymous'
  }
}
