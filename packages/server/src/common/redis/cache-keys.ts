/**
 * Redis cache key constants and TTL configuration.
 */

export const CACHE_KEYS = {
  /** Customer list — keyed by serialized query params */
  CUSTOMER_LIST: 'cache:customers:list',
  /** Opportunity stage stats */
  OPPORTUNITY_STATS: 'cache:opportunities:stats',
  /** Knowledge category tree */
  CATEGORY_TREE: 'cache:knowledge:categories',
  /** JWT blacklist — suffix is jti or token hash */
  JWT_BLACKLIST: 'auth:blacklist',
} as const

/** TTL values in seconds */
export const CACHE_TTL = {
  /** Customer list cache: 60 s */
  CUSTOMER_LIST: 60,
  /** Opportunity stats cache: 300 s */
  OPPORTUNITY_STATS: 300,
  /** Category tree cache: 600 s */
  CATEGORY_TREE: 600,
} as const
