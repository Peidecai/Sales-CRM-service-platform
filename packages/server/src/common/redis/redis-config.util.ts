import type { ConfigService } from '@nestjs/config'
import type { RedisOptions } from 'ioredis'

/**
 * Shared Redis connection options builder.
 *
 * Standalone mode (default — local dev, single-node):
 *   Reads REDIS_HOST / REDIS_PORT.
 *
 * Sentinel mode (production HA):
 *   Activated when REDIS_SENTINELS is set.
 *   Format: "host1:port1,host2:port2,host3:port3"
 *   Master name: REDIS_SENTINEL_NAME (default: "mymaster")
 *   Sentinel auth: REDIS_SENTINEL_PASSWORD
 *
 * Both modes share the same data auth (REDIS_PASSWORD) and DB index (REDIS_DB).
 *
 * Usage:
 *   new Redis(buildRedisOptions(configService))
 *   BullModule.forRootAsync({ useFactory: (c) => ({ redis: buildRedisOptions(c) }) })
 */
export function buildRedisOptions(config: ConfigService): RedisOptions {
  const password = config.get<string>('REDIS_PASSWORD', '') || undefined
  const db = config.get<number>('REDIS_DB', 0)

  // Shared performance / resilience settings
  const commonOptions: RedisOptions = {
    password,
    db,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    commandTimeout: 3000,
    lazyConnect: false,
  }

  const sentinelsRaw = config.get<string>('REDIS_SENTINELS', '')
  if (sentinelsRaw) {
    // Sentinel mode — parse "host1:port1,host2:port2" into SentinelAddress[]
    const sentinels = sentinelsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const lastColon = s.lastIndexOf(':')
        if (lastColon === -1) return { host: s, port: 26379 }
        return {
          host: s.slice(0, lastColon),
          port: parseInt(s.slice(lastColon + 1), 10) || 26379,
        }
      })

    const sentinelPassword = config.get<string>('REDIS_SENTINEL_PASSWORD', '') || undefined

    return {
      ...commonOptions,
      // Tell ioredis to use Sentinel mode
      sentinels,
      name: config.get<string>('REDIS_SENTINEL_NAME', 'mymaster'),
      // Sentinel nodes may have a separate auth password from data nodes
      sentinelPassword,
    }
  }

  // Standalone mode
  return {
    ...commonOptions,
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
  }
}
