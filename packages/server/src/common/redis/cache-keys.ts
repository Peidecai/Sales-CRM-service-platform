/**
 * Redis cache key constants and TTL configuration.
 */

export const CACHE_KEYS = {
  /** Customer list — keyed by serialized query params */
  CUSTOMER_LIST: 'cache:customers:list',
  /** Customer detail — suffix is :id */
  CUSTOMER_DETAIL: 'cache:customers:detail',
  /** Opportunity stage stats */
  OPPORTUNITY_STATS: 'cache:opportunities:stats',
  /** Opportunity detail — suffix is :id */
  OPPORTUNITY_DETAIL: 'cache:opportunities:detail',
  /** Knowledge category tree */
  CATEGORY_TREE: 'cache:knowledge:categories',
  /** JWT blacklist — suffix is jti or token hash */
  JWT_BLACKLIST: 'auth:blacklist',
  /** Follow-up list by customer — suffix is :customerId */
  FOLLOW_UP_LIST: 'cache:follow-ups:customer',
  /** Sales target stats */
  SALES_TARGET_STATS: 'cache:sales-targets:stats',
  /** Knowledge search history — suffix is :userId */
  KNOWLEDGE_SEARCH_HISTORY: (userId: number) => `knowledge:search:history:${userId}`,
} as const

/** TTL values in seconds */
export const CACHE_TTL = {
  /** Customer list cache: 60 s */
  CUSTOMER_LIST: 60,
  /** Customer detail cache: 120 s */
  CUSTOMER_DETAIL: 120,
  /** Opportunity stats cache: 300 s */
  OPPORTUNITY_STATS: 300,
  /** Opportunity detail cache: 120 s */
  OPPORTUNITY_DETAIL: 120,
  /** Category tree cache: 600 s */
  CATEGORY_TREE: 600,
  /** Follow-up list cache: 60 s */
  FOLLOW_UP_LIST: 60,
  /** Sales target stats cache: 300 s */
  SALES_TARGET_STATS: 300,
} as const
