import { Controller, Get, Post, Body, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckError,
  TypeOrmHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus'
import { RedisService } from '../../common/redis'

interface ErrorReportDto {
  message: string
  stack?: string
  page?: string
  timestamp: number
  deviceInfo: Record<string, unknown>
  appVersion: string
  userId?: string
}

@ApiTags('系统')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger('AppErrorReport')

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

@ApiTags('系统')
@Controller('app')
export class AppErrorReportController {
  private readonly logger = new Logger('AppErrorReport')

  @Post('error-report')
  @ApiOperation({ summary: 'APP 端错误上报' })
  reportError(@Body() body: ErrorReportDto) {
    this.logger.warn(
      `[APP Error] ${body.message} | page=${body.page || 'unknown'} | user=${body.userId || 'anonymous'} | version=${body.appVersion} | device=${JSON.stringify(body.deviceInfo)}`,
    )
    if (body.stack) {
      this.logger.debug(`Stack: ${body.stack}`)
    }
    return { code: 0, message: 'success', data: null }
  }
}
