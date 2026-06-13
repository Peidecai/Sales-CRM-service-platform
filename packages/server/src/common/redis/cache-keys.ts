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
  /** Opportunity sales funnel */
  OPPORTUNITY_FUNNEL: 'cache:opportunities:funnel',
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
  /** Prospect list — keyed by serialized query params */
  PROSPECT_LIST: 'cache:prospects:list',
  /** Prospect detail — suffix is :id */
  PROSPECT_DETAIL: 'cache:prospects:detail',
  /** Prospect stats — suffix is :role:uid */
  PROSPECT_STATS: 'cache:prospects:stats',
  /** Prospect data sources list */
  PROSPECT_DATA_SOURCES: 'cache:prospects:data-sources',
  /** Prospect filter configuration */
  PROSPECT_FILTER_CONFIG: 'cache:prospects:filter-config',
  /** Prospect search templates */
  PROSPECT_SEARCH_TEMPLATES: 'cache:prospects:templates',
  /** AI analysis global config (single-row, id=1) */
  AI_ANALYSIS_CONFIG: 'cache:ai:analysis-config',
} as const

/** TTL values in seconds */
export const CACHE_TTL = {
  /** Customer list cache: 60 s */
  CUSTOMER_LIST: 60,
  /** Customer detail cache: 120 s */
  CUSTOMER_DETAIL: 120,
  /** Opportunity stats cache: 300 s */
  OPPORTUNITY_STATS: 300,
  /** Opportunity funnel cache: 300 s */
  OPPORTUNITY_FUNNEL: 300,
  /** Opportunity detail cache: 120 s */
  OPPORTUNITY_DETAIL: 120,
  /** Category tree cache: 600 s */
  CATEGORY_TREE: 600,
  /** Follow-up list cache: 60 s */
  FOLLOW_UP_LIST: 60,
  /** Sales target stats cache: 300 s */
  SALES_TARGET_STATS: 300,
  /** Prospect list cache: 60 s */
  PROSPECT_LIST: 60,
  /** Prospect detail cache: 120 s */
  PROSPECT_DETAIL: 120,
  /** Prospect stats cache: 300 s */
  PROSPECT_STATS: 300,
  /** Prospect data sources cache: 300 s */
  PROSPECT_DATA_SOURCES: 300,
  /** Prospect filter config cache: 300 s */
  PROSPECT_FILTER_CONFIG: 300,
  /** Prospect search templates cache: 120 s */
  PROSPECT_SEARCH_TEMPLATES: 120,
  /** AI analysis config cache: 300 s */
  AI_ANALYSIS_CONFIG: 300,
} as const
