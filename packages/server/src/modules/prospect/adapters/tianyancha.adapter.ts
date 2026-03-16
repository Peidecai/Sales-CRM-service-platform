import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import type {
  IProspectAdapter,
  DataSourceCredentials,
  ProspectSearchResponse,
} from './prospect-adapter.interface'
import { ProspectChannel } from '@crm/shared'
import type { ProspectSearchQuery, ProspectSearchResult } from '@crm/shared'

const DEFAULT_ENDPOINT = 'https://open.api.tianyancha.com/services/open/search/2.0'

/**
 * 天眼查数据源适配器
 * API 文档: https://open.tianyancha.com/open/869
 *
 * Stateless — credentials passed per-call to avoid singleton concurrency issues.
 */
@Injectable()
export class TianyanchaAdapter implements IProspectAdapter {
  readonly channel = ProspectChannel.TIANYANCHA
  private readonly logger = new Logger(TianyanchaAdapter.name)
  private readonly envApiKey: string | undefined

  constructor(private readonly configService: ConfigService) {
    this.envApiKey = this.configService.get<string>('TIANYANCHA_API_KEY')
  }

  /** env-var based availability (for legacy fallback path) */
  isAvailable(): boolean {
    return !!this.envApiKey
  }

  async search(
    query: ProspectSearchQuery,
    credentials?: DataSourceCredentials,
  ): Promise<ProspectSearchResponse> {
    const apiKey = credentials?.apiKey ?? this.envApiKey
    if (!apiKey) {
      return { results: [], total: 0, cost: 0 }
    }

    const endpoint = credentials?.apiEndpoint || DEFAULT_ENDPOINT

    try {
      const response = await axios.get<TianyanchaSearchResponse>(endpoint, {
        headers: { Authorization: apiKey },
        params: {
          word: query.keyword,
          pageNum: query.page || 1,
          pageSize: query.pageSize || 20,
        },
        timeout: 10000,
      })

      const data = response.data
      if (!data || data.state !== 'ok' || !data.data) {
        return { results: [], total: 0, cost: 0 }
      }

      const items: TianyanchaCompany[] = data.data.items || []
      const total: number = data.data.total || 0

      const results: ProspectSearchResult[] = items.map((item) => {
        const { province, city } = parseRegLocation(item.regLocation)
        return {
          companyName: item.name || '',
          legalPerson: item.legalPersonName || undefined,
          registeredCapital: item.regCapital || undefined,
          establishDate: item.estiblishTime ? formatTimestamp(item.estiblishTime) : undefined,
          industry: item.industry || undefined,
          province: province || undefined,
          city: city || undefined,
          address: item.regLocation || undefined,
          unifiedCreditCode: item.creditCode || undefined,
          channel: ProspectChannel.TIANYANCHA,
        }
      })

      return { results, total, cost: results.length }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const status = axios.isAxiosError(err)
        ? (err as import('axios').AxiosError).response?.status
        : undefined
      this.logger.error(`天眼查搜索失败 [HTTP ${status ?? 'N/A'}]: ${errMsg}`)
      if (status === 401 || status === 403) {
        throw new Error(`天眼查认证失败 (HTTP ${status})，请检查 API Key`)
      }
      if (status === 429) {
        throw new Error('天眼查 API 调用频率超限，请稍后重试')
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

interface TianyanchaSearchResponse {
  state: string
  message?: string
  data: {
    total: number
    items: TianyanchaCompany[]
  } | null
}

interface TianyanchaCompany {
  name?: string
  legalPersonName?: string
  regCapital?: string
  estiblishTime?: string | number
  industry?: string
  regLocation?: string
  creditCode?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRegLocation(location?: string): { province: string; city: string } {
  if (!location) return { province: '', city: '' }

  const provinceMatch = location.match(/^(.{2,4}[省市自治区])/)
  const province = provinceMatch ? provinceMatch[1] : ''

  const cityMatch = location.slice(province.length).match(/^(.{2,5}[市地州])/)
  const city = cityMatch ? cityMatch[1] : ''

  return { province, city }
}

function formatTimestamp(value: string | number): string {
  if (typeof value === 'number') {
    const ms = value > 1e10 ? value : value * 1000
    return new Date(ms).toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const ts = Date.parse(value)
  return isNaN(ts) ? value : new Date(ts).toISOString().slice(0, 10)
}
