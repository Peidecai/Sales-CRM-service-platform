import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', '') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
      lazyConnect: false,
    })

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err)
    })
    this.client.on('connect', () => {
      this.logger.log('Redis connected')
    })
  }

  /** Get raw ioredis client (for health-check, etc.) */
  getClient(): Redis {
    return this.client
  }

  /** Get a cached value (returns null if miss) */
  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  /** Set a value with optional TTL (seconds) */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, value)
    }
  }

  /** Delete one or more keys */
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0
    return this.client.del(...keys)
  }

  /** Delete all keys matching a pattern (uses SCAN, safe for production) */
  async delByPattern(pattern: string): Promise<number> {
    let deleted = 0
    const stream = this.client.scanStream({ match: pattern, count: 100 })

    return new Promise((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          deleted += keys.length
          void this.client.del(...keys)
        }
      })
      stream.on('end', () => resolve(deleted))
      stream.on('error', (err) => reject(err))
    })
  }

  /** Check if key exists */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /** Ping Redis — used for health check */
  async ping(): Promise<string> {
    return this.client.ping()
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
    this.logger.log('Redis disconnected')
  }
}
