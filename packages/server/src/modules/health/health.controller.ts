import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckError,
  TypeOrmHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus'
import { RedisService } from '../../common/redis'

@ApiTags('系统')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redisService: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '健康检查' })
  check() {
    return this.health.check(this.indicators())
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness health check' })
  readiness() {
    return this.health.check(this.indicators())
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

  private indicators() {
    return [() => this.db.pingCheck('database'), () => this.checkRedis()]
  }
}
