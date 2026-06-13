import { HealthCheckError, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'
import { HealthController } from '../../src/modules/health/health.controller'
import { RedisService } from '../../src/common/redis'

describe('HealthController', () => {
  let controller: HealthController
  let health: { check: jest.Mock }
  let db: { pingCheck: jest.Mock }
  let redis: { ping: jest.Mock }

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

    controller = new HealthController(
      health as unknown as HealthCheckService,
      db as unknown as TypeOrmHealthIndicator,
      redis as unknown as RedisService,
    )
  })

  it('check should run db and redis indicators', async () => {
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } })
    redis.ping.mockResolvedValue('PONG')
    health.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      const results = await Promise.all(indicators.map((fn) => fn()))
      return Object.assign({}, ...results)
    })

    const result = await controller.check()

    expect(db.pingCheck).toHaveBeenCalledWith('database')
    expect(redis.ping).toHaveBeenCalled()
    expect(result).toMatchObject({
      database: { status: 'up' },
      redis: { status: 'up', message: 'PONG' },
    })
  })

  it('readiness should use same indicator pipeline as check', async () => {
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } })
    redis.ping.mockResolvedValue('PONG')
    health.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      const results = await Promise.all(indicators.map((fn) => fn()))
      return Object.assign({}, ...results)
    })

    const result = await controller.readiness()

    expect(db.pingCheck).toHaveBeenCalledWith('database')
    expect(redis.ping).toHaveBeenCalled()
    expect(result).toMatchObject({
      database: { status: 'up' },
      redis: { status: 'up', message: 'PONG' },
    })
  })

  it('should throw HealthCheckError when redis ping fails', async () => {
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } })
    redis.ping.mockRejectedValue(new Error('redis down'))
    health.check.mockImplementation(async (indicators: Array<() => Promise<unknown>>) => {
      const results = await Promise.all(indicators.map((fn) => fn()))
      return Object.assign({}, ...results)
    })

    await expect(controller.check()).rejects.toBeInstanceOf(HealthCheckError)
  })
})

