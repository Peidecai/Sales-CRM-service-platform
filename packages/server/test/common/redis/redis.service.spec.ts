import { EventEmitter } from 'events'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisModule } from '../../../src/common/redis'
import { RedisService } from '../../../src/common/redis/redis.service'

const mockClient = {
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scanStream: jest.fn(),
  exists: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}))

describe('RedisService', () => {
  let service: RedisService
  let configService: { get: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    configService = {
      get: jest.fn((key: string, defaultVal: unknown) => {
        const map: Record<string, unknown> = {
          REDIS_HOST: '127.0.0.1',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: '',
          REDIS_DB: 0,
        }
        return map[key] ?? defaultVal
      }),
    }
    service = new RedisService(configService as unknown as ConfigService)
  })

  it('should expose raw client', () => {
    expect(service.getClient()).toBe(mockClient as never)
  })

  it('should re-export RedisModule from barrel index', () => {
    expect(RedisModule).toBeDefined()
  })

  it('should log connect and error events from redis client', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    const error = new Error('redis broken')
    const errorHandler = mockClient.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'error',
    )?.[1] as ((err: Error) => void) | undefined
    const connectHandler = mockClient.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    )?.[1] as (() => void) | undefined

    expect(errorHandler).toBeDefined()
    expect(connectHandler).toBeDefined()

    errorHandler?.(error)
    connectHandler?.()

    expect(errorSpy).toHaveBeenCalledWith('Redis connection error', error)
    expect(logSpy).toHaveBeenCalledWith('Redis connected')
  })

  it('get should read value by key', async () => {
    mockClient.get.mockResolvedValue('v1')

    const result = await service.get('k1')

    expect(mockClient.get).toHaveBeenCalledWith('k1')
    expect(result).toBe('v1')
  })

  it('set should set value without ttl', async () => {
    mockClient.set.mockResolvedValue('OK')

    await service.set('k1', 'v1')

    expect(mockClient.set).toHaveBeenCalledWith('k1', 'v1')
  })

  it('set should set value with ttl', async () => {
    mockClient.set.mockResolvedValue('OK')

    await service.set('k1', 'v1', 60)

    expect(mockClient.set).toHaveBeenCalledWith('k1', 'v1', 'EX', 60)
  })

  it('del should return 0 for empty keys', async () => {
    const result = await service.del()
    expect(result).toBe(0)
    expect(mockClient.del).not.toHaveBeenCalled()
  })

  it('del should delete keys', async () => {
    mockClient.del.mockResolvedValue(2)

    const result = await service.del('k1', 'k2')

    expect(mockClient.del).toHaveBeenCalledWith('k1', 'k2')
    expect(result).toBe(2)
  })

  it('delByPattern should scan and delete matched keys', async () => {
    const stream = new EventEmitter()
    mockClient.scanStream.mockReturnValue(stream)
    mockClient.del.mockResolvedValue(2)

    const promise = service.delByPattern('cache:*')
    stream.emit('data', ['cache:1', 'cache:2'])
    stream.emit('data', [])
    stream.emit('end')

    const result = await promise

    expect(mockClient.scanStream).toHaveBeenCalledWith({ match: 'cache:*', count: 100 })
    expect(mockClient.del).toHaveBeenCalledWith('cache:1', 'cache:2')
    expect(result).toBe(2)
  })

  it('delByPattern should resolve 0 on stream error (graceful)', async () => {
    const stream = new EventEmitter()
    mockClient.scanStream.mockReturnValue(stream)

    const promise = service.delByPattern('cache:*')
    stream.emit('error', new Error('scan failed'))

    const result = await promise
    expect(result).toBe(0)
  })

  it('exists should map 1 to true and 0 to false', async () => {
    mockClient.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0)

    await expect(service.exists('k1')).resolves.toBe(true)
    await expect(service.exists('k2')).resolves.toBe(false)
  })

  it('ping should return pong string', async () => {
    mockClient.ping.mockResolvedValue('PONG')
    await expect(service.ping()).resolves.toBe('PONG')
  })

  it('onModuleDestroy should quit and log', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    mockClient.quit.mockResolvedValue('OK')

    await service.onModuleDestroy()

    expect(mockClient.quit).toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalled()
  })
})
