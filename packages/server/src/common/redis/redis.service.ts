import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { buildRedisOptions } from './redis-config.util'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(buildRedisOptions(this.configService))

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err)
    })
    this.client.on('connect', () => {
      this.logger.log('Redis connected')
    })
    this.client.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting...')
    })
  }

  /** Get raw ioredis client (for health-check, etc.) */
  getClient(): Redis {
    return this.client
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  /**
   * Get a cached value. Returns null on both cache miss and Redis error.
   * Use for business cache reads — Redis unavailability is treated as a miss.
   */
  async safeGet(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (err) {
      this.logger.warn(`Redis safeGet failed for key "${key}": ${(err as Error).message}`)
      return null
    }
  }

  /**
   * Get a cached value, propagating errors.
   * Use in auth paths where the caller handles errors explicitly.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  /** Check if key exists, propagating errors.
   * Use in auth paths where the caller handles errors explicitly.
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /** Check if key exists. Returns false on Redis error (fail-open for cache checks). */
  async safeExists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (err) {
      this.logger.warn(`Redis safeExists failed for key "${key}": ${(err as Error).message}`)
      return false
    }
  }

  // ─── Writes (best-effort — errors are logged and swallowed) ─────────────

  /** Set a value with optional TTL (seconds). Errors are logged and swallowed. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds)
      } else {
        await this.client.set(key, value)
      }
    } catch (err) {
      this.logger.warn(`Redis set failed for key "${key}": ${(err as Error).message}`)
    }
  }

  /** Delete one or more keys. Errors are logged and swallowed. */
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0
    try {
      return await this.client.del(...keys)
    } catch (err) {
      this.logger.warn(`Redis del failed for keys [${keys.join(', ')}]: ${(err as Error).message}`)
      return 0
    }
  }

  /** Delete all keys matching a pattern (uses SCAN, safe for production).
   *  All DEL commands are awaited before resolving — returns actual deleted count. */
  async delByPattern(pattern: string): Promise<number> {
    const delPromises: Promise<number>[] = []
    // 使用 SCAN 流式遍历，避免生产 Redis 上 KEYS 阻塞主线程。
    const stream = this.client.scanStream({ match: pattern, count: 100 })

    return new Promise((resolve) => {
      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          delPromises.push(this.client.del(...keys))
        }
      })
      stream.on('end', () => {
        Promise.all(delPromises)
          .then((counts) => resolve(counts.reduce((sum, n) => sum + n, 0)))
          .catch((err) => {
            this.logger.warn(
              `Redis delByPattern del error for pattern "${pattern}": ${(err as Error).message}`,
            )
            resolve(delPromises.length)
          })
      })
      stream.on('error', (err) => {
        this.logger.warn(`Redis delByPattern scan error for pattern "${pattern}": ${err.message}`)
        resolve(0)
      })
    })
  }

  /** Ping Redis — used for health check */
  async ping(): Promise<string> {
    return this.client.ping()
  }

  /** Increment a key and return new value. Errors are logged and swallowed (returns 0). */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key)
    } catch (err) {
      this.logger.warn(`Redis incr failed for key "${key}": ${(err as Error).message}`)
      return 0
    }
  }

  /** Set expiration on a key (seconds). Errors are logged and swallowed. */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds)
    } catch (err) {
      this.logger.warn(`Redis expire failed for key "${key}": ${(err as Error).message}`)
    }
  }

  /** Get all fields of a Redis Hash. Errors are logged and swallowed (returns {}). */
  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key)
    } catch (err) {
      this.logger.warn(`Redis hGetAll failed for key "${key}": ${(err as Error).message}`)
      return {}
    }
  }

  /** Set a field in a Redis Hash. Errors are logged and swallowed. */
  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hset(key, field, value)
    } catch (err) {
      this.logger.warn(`Redis hSet failed for key "${key}.${field}": ${(err as Error).message}`)
    }
  }

  /** Get a single field from a Redis Hash. Returns null on error. */
  async hGet(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field)
    } catch (err) {
      this.logger.warn(`Redis hGet failed for key "${key}.${field}": ${(err as Error).message}`)
      return null
    }
  }

  /** ZADD: add member with score. Errors are logged and swallowed. */
  async zAdd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zadd(key, score, member)
    } catch (err) {
      this.logger.warn(`Redis zAdd failed for key "${key}": ${(err as Error).message}`)
      return 0
    }
  }

  /** ZREMRANGEBYRANK: remove by rank range. Errors are logged and swallowed. */
  async zRemRangeByRank(key: string, start: number, stop: number): Promise<number> {
    try {
      return await this.client.zremrangebyrank(key, start, stop)
    } catch (err) {
      this.logger.warn(`Redis zRemRangeByRank failed for key "${key}": ${(err as Error).message}`)
      return 0
    }
  }

  /** ZREVRANGE: get members from high to low score. Returns [] on error. */
  async zRevRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zrevrange(key, start, stop)
    } catch (err) {
      this.logger.warn(`Redis zRevRange failed for key "${key}": ${(err as Error).message}`)
      return []
    }
  }

  /** ZRANGEBYSCORE: get members with score between min and max. Returns [] on error. */
  async zRangeByScore(key: string, min: number | string, max: number | string): Promise<string[]> {
    try {
      return await this.client.zrangebyscore(key, min, max)
    } catch (err) {
      this.logger.warn(`Redis zRangeByScore failed for key "${key}": ${(err as Error).message}`)
      return []
    }
  }

  /** ZREM: remove one or more members from a sorted set. Errors are logged and swallowed. */
  async zRem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0
    try {
      return await this.client.zrem(key, ...members)
    } catch (err) {
      this.logger.warn(`Redis zRem failed for key "${key}": ${(err as Error).message}`)
      return 0
    }
  }

  /** SETBIT: set or clear the bit at offset. Errors are logged and swallowed (returns 0). */
  async setBit(key: string, offset: number, value: 0 | 1): Promise<number> {
    try {
      return await this.client.setbit(key, offset, value)
    } catch (err) {
      this.logger.warn(`Redis setBit failed for key "${key}[${offset}]": ${(err as Error).message}`)
      return 0
    }
  }

  /** GETBIT: returns the bit value at offset. Returns 0 on error. */
  async getBit(key: string, offset: number): Promise<number> {
    try {
      return await this.client.getbit(key, offset)
    } catch (err) {
      this.logger.warn(`Redis getBit failed for key "${key}[${offset}]": ${(err as Error).message}`)
      return 0
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
    this.logger.log('Redis disconnected')
  }
}
