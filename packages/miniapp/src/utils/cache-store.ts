/**
 * CacheStore — uni-app storage wrapper with TTL support
 *
 * Key prefixes & default TTL:
 *   crm_cache_user:       30min (1800s)
 *   crm_cache_customers:  15min (900s)
 *   crm_cache_dict:       24h   (86400s)
 */

interface CacheItem<T = unknown> {
  data: T
  expireAt: number
}

export const CACHE_PREFIX = {
  USER: 'crm_cache_user:',
  CUSTOMERS: 'crm_cache_customers:',
  DICT: 'crm_cache_dict:',
} as const

export const CACHE_TTL = {
  USER: 1800,      // 30 minutes
  CUSTOMERS: 900,  // 15 minutes
  DICT: 86400,     // 24 hours
} as const

export const cacheStore = {
  /**
   * Store data with TTL (in seconds)
   */
  set<T>(key: string, data: T, ttlSec: number): void {
    const item: CacheItem<T> = {
      data,
      expireAt: Date.now() + ttlSec * 1000,
    }
    try {
      uni.setStorageSync(key, JSON.stringify(item))
    } catch (e) {
      console.warn('[CacheStore] set failed:', key, e)
    }
  },

  /**
   * Get data from cache, returns null if expired or missing
   */
  get<T>(key: string): T | null {
    try {
      const raw = uni.getStorageSync(key)
      if (!raw) return null

      const item: CacheItem<T> = JSON.parse(raw as string)
      if (Date.now() > item.expireAt) {
        uni.removeStorageSync(key)
        return null
      }
      return item.data
    } catch {
      return null
    }
  },

  /**
   * Remove a specific cache key
   */
  remove(key: string): void {
    try {
      uni.removeStorageSync(key)
    } catch (e) {
      console.warn('[CacheStore] remove failed:', key, e)
    }
  },

  /**
   * Clear all cache keys with a given prefix
   */
  clear(prefix: string): void {
    try {
      const res = uni.getStorageInfoSync()
      const keys = res.keys || []
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          uni.removeStorageSync(key)
        }
      }
    } catch (e) {
      console.warn('[CacheStore] clear failed:', prefix, e)
    }
  },
}
