import type { ProspectChannel, ProspectSearchQuery, ProspectSearchResult } from '@crm/shared'

export interface DataSourceCredentials {
  apiKey: string
  apiSecret?: string
  apiEndpoint?: string
}

export interface ProspectSearchResponse {
  results: ProspectSearchResult[]
  total: number
  cost: number
}

/**
 * 互联网获客数据源适配器接口。
 * 每个第三方数据源实现此接口，搜索层通过适配器统一调用。
 *
 * NOTE: Credentials are passed per-call to avoid shared mutable state on singletons.
 */
export interface IProspectAdapter {
  /** 数据源渠道标识 */
  readonly channel: ProspectChannel

  /** 按条件搜索企业数据 — credentials passed per-call for thread safety */
  search(
    query: ProspectSearchQuery,
    credentials?: DataSourceCredentials,
  ): Promise<ProspectSearchResponse>

  /** 获取企业详细信息（可选） */
  getDetail?(
    companyName: string,
    credentials?: DataSourceCredentials,
  ): Promise<ProspectSearchResult | null>

  /** 当前适配器是否可用（env-var configured）。DB-configured adapters skip this check. */
  isAvailable(): boolean

  /** 测试数据源连接是否正常 — credentials passed per-call */
  testConnection?(credentials: DataSourceCredentials): Promise<boolean>
}
