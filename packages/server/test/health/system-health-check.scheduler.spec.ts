import { Logger } from '@nestjs/common'
import { HealthCheckService, HealthCheckError, TypeOrmHealthIndicator } from '@nestjs/terminus'
import { RedisService } from '../../src/common/redis'
import { SystemHealthCheckScheduler } from '../../src/modules/health/system-health-check.scheduler'

describe('SystemHealthCheckScheduler', () => {
  let scheduler: SystemHealthCheckScheduler
  let health: { check: jest.Mock }
  let db: { pingCheck: jest.Mock }
  let redis: { ping: jest.Mock }
  let loggerLogSpy: jest.SpyInstance
  let loggerErrorSpy: jest.SpyInstance

  beforeEach(() => {
    health = {
      check: jest.fn(),
    }
    db = {
      pingCheck: jest.fn(),
    }
    redis = {
      ping: jest.fn(),
    }

    scheduler = new SystemHealthCheckScheduler(
      health as unknown as HealthCheckService,
      db as unknown as TypeOrmHealthIndicator,
      redis as unknown as RedisService,
    )

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    loggerLogSpy.mockRestore()
    loggerErrorSpy.mockRestore()
  })

  it('run should check database and redis and log success', async () => {
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } })
    redis.ping.mockResolvedValue('PONG')
    health.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      const results = await Promise.all(indicators.map((fn) => fn()))
      return Object.assign({}, ...results)
    })

    await scheduler.run()

    expect(db.pingCheck).toHaveBeenCalledWith('database')
    expect(redis.ping).toHaveBeenCalled()
    expect(loggerLogSpy).toHaveBeenCalledWith('Scheduled health check passed')
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('run should catch indicator error and log failure without throwing', async () => {
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } })
    redis.ping.mockRejectedValue(new Error('redis down'))
    health.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      const results = await Promise.all(indicators.map((fn) => fn()))
      return Object.assign({}, ...results)
    })

    await expect(scheduler.run()).resolves.toBeUndefined()
    expect(loggerErrorSpy).toHaveBeenCalled()
  })

  it('run should catch direct health service failures', async () => {
    health.check.mockRejectedValue(new HealthCheckError('failed', {}))

    await expect(scheduler.run()).resolves.toBeUndefined()
    expect(loggerErrorSpy).toHaveBeenCalled()
  })
})
