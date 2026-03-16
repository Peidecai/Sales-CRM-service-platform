import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import * as crypto from 'crypto'
import type {
  IProspectAdapter,
  DataSourceCredentials,
  ProspectSearchResponse,
} from './prospect-adapter.interface'
import { ProspectChannel } from '@crm/shared'
import type { ProspectSearchQuery, ProspectSearchResult } from '@crm/shared'

const DEFAULT_ENDPOINT = 'https://api.qichacha.com/ECIV4/Search'

/**
 * 企查查数据源适配器
 * API 文档: https://openapi.qichacha.com/
 *
 * Stateless — credentials passed per-call to avoid singleton concurrency issues.
 */
@Injectable()
export class QichachaAdapter implements IProspectAdapter {
  readonly channel = ProspectChannel.QICHACHA
  private readonly logger = new Logger(QichachaAdapter.name)
  private readonly envApiKey: string | undefined
  private readonly envApiSecret: string | undefined

  constructor(private readonly configService: ConfigService) {
    this.envApiKey = this.configService.get<string>('QICHACHA_API_KEY')
    this.envApiSecret = this.configService.get<string>('QICHACHA_API_SECRET')
  }

  isAvailable(): boolean {
    return !!(this.envApiKey && this.envApiSecret)
  }

  async search(
    query: ProspectSearchQuery,
    credentials?: DataSourceCredentials,
  ): Promise<ProspectSearchResponse> {
    const apiKey = credentials?.apiKey ?? this.envApiKey
    const secretKey = credentials?.apiSecret ?? this.envApiSecret ?? ''
    if (!apiKey) {
      return { results: [], total: 0, cost: 0 }
    }

    const endpoint = credentials?.apiEndpoint || DEFAULT_ENDPOINT

    // Signature: MD5(Key + Timespan + SecretKey).toUpperCase()
    const timespan = Math.floor(Date.now() / 1000).toString()
    const token = crypto
      .createHash('md5')
      .update(apiKey + timespan + secretKey)
      .digest('hex')
      .toUpperCase()

    try {
      const response = await axios.get<QichachaSearchResponse>(endpoint, {
        headers: {
          Key: apiKey,
          Timespan: timespan,
          Token: token,
        },
        params: {
          keyword: query.keyword,
          pageIndex: query.page || 1,
          pageSize: query.pageSize || 20,
        },
        timeout: 10000,
      })

      const data = response.data
      if (!data || data.Status !== '200' || !data.Result) {
        return { results: [], total: 0, cost: 0 }
      }

      const items: QichachaCompany[] = data.Result || []
      const total: number = data.Paging?.TotalRecords ?? items.length

      const results: ProspectSearchResult[] = items.map((item) => {
        const { province } = parseArea(item.Area)
        return {
          companyName: item.Name || '',
          legalPerson: item.OperName || undefined,
          registeredCapital: item.RegistCapi || undefined,
          establishDate: item.StartDate || undefined,
          industry: item.Industry || undefined,
          province: province || undefined,
          city: undefined,
          address: item.Area || undefined,
          unifiedCreditCode: item.CreditCode || undefined,
          channel: ProspectChannel.QICHACHA,
        }
      })

      return { results, total, cost: results.length }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      this.logger.error(`企查查搜索失败 [HTTP ${status ?? 'N/A'}]: ${errMsg}`)
      if (status === 401 || status === 403) {
        throw new Error(`企查查认证失败 (HTTP ${status})，请检查 API Key/Secret`)
      }
      if (status === 429) {
        throw new Error('企查查 API 调用频率超限，请稍后重试')
      }
      return { results: [], total: 0, cost: 0 }
    }
  }

  async getDetail(
    companyName: string,
    credentials?: DataSourceCredentials,
  ): Promise<ProspectSearchResult | null> {
    const { results } = await this.search({ keyword: companyName, pageSize: 1 }, credentials)
    return results[0] ?? null
  }

  async testConnection(credentials: DataSourceCredentials): Promise<boolean> {
    try {
      const { results } = await this.search({ keyword: 'test', pageSize: 1 }, credentials)
      return Array.isArray(results)
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Internal response types
// ---------------------------------------------------------------------------

interface QichachaSearchResponse {
  Status: string
  Message?: string
  Result: QichachaCompany[] | null
  Paging?: {
    PageIndex: number
    PageSize: number
    TotalRecords: number
  }
}

interface QichachaCompany {
  Name?: string
  OperName?: string
  RegistCapi?: string
  StartDate?: string
  Industry?: string
  Area?: string
  CreditCode?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArea(area?: string): { province: string } {
  if (!area) return { province: '' }
  const province = area.endsWith('省') || area.endsWith('市') || area.endsWith('区') ? area : area
  return { province }
}
