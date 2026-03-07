import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import {
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus'
import { RedisService } from '../../common/redis'

@Injectable()
export class SystemHealthCheckScheduler {
  private readonly logger = new Logger(SystemHealthCheckScheduler.name)

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redisService: RedisService,
  ) {}

  @Cron('0 */5 * * * *', { name: 'system-health-check', timeZone: 'Asia/Shanghai' })
  async run(): Promise<void> {
    try {
      await this.health.check(this.indicators())
      this.logger.log('Scheduled health check passed')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Scheduled health check failed: ${message}`)
    }
  }

  private indicators() {
    return [() => this.db.pingCheck('database'), () => this.checkRedis()]
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const key = 'redis'
    try {
      const pong = await this.redisService.ping()
      return { [key]: { status: 'up' as const, message: pong } }
    } catch (error) {
      const result: HealthIndicatorResult = {
        [key]: { status: 'down' as const, message: String(error) },
      }
      throw new HealthCheckError('Redis health check failed', result)
    }
  }
}
