import request from './request'
import type { ApiResponse } from './types'
import { ProspectChannel } from '@crm/shared'

export { ProspectChannel }

/* ========== VO 接口 ========== */

export interface DataSourceVO {
  id: number
  name: string
  channel: ProspectChannel
  apiKeyMasked: string
  hasApiSecret: boolean
  apiEndpoint: string | null
  isEnabled: boolean
  dailyQuota: number
  usedToday: number
  totalUsed: number
  lastCalledAt: string | null
  config: Record<string, unknown> | null
  remark: string | null
  createdAt: string
  updatedAt: string
}

/** Payload for create/update — includes raw apiKey/apiSecret */
export interface DataSourcePayload {
  name?: string
  channel?: ProspectChannel
  apiKey?: string
  apiSecret?: string | null
  apiEndpoint?: string | null
  dailyQuota?: number
  isEnabled?: boolean
  remark?: string | null
}

export interface SearchTemplateVO {
  id: number
  name: string
  userId: number
  conditions: Record<string, unknown>
  isShared: boolean
  sortOrder: number
  createdAt: string
}

export interface CustomFilterVO {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'dateRange'
  options?: string[]
}

export interface FilterConfigVO {
  id: number
  enabledFilters: string[]
  customFilters: CustomFilterVO[]
  updatedBy: number
  updatedAt: string
}

export interface TestResultVO {
  success: boolean
  message: string
}

/* ========== Data Source API ========== */

export const dataSourceApi = {
  /** 获取所有数据源 */
  getAll(): Promise<ApiResponse<DataSourceVO[]>> {
    return request.get('/prospects/data-sources')
  },

  /** 创建数据源 */
  create(data: DataSourcePayload): Promise<ApiResponse<DataSourceVO>> {
    return request.post('/prospects/data-sources', data)
  },

  /** 更新数据源 */
  update(id: number, data: DataSourcePayload): Promise<ApiResponse<DataSourceVO>> {
    return request.put(`/prospects/data-sources/${id}`, data)
  },

  /** 删除数据源 */
  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/prospects/data-sources/${id}`)
  },

  /** 测试数据源连通性 */
  test(id: number): Promise<ApiResponse<TestResultVO>> {
    return request.post(`/prospects/data-sources/${id}/test`)
  },
}

/* ========== Search Template API ========== */

export const searchTemplateApi = {
  /** 获取所有搜索模板 */
  getAll(): Promise<ApiResponse<SearchTemplateVO[]>> {
    return request.get('/prospects/search-templates')
  },

  /** 创建搜索模板 */
  create(data: {
    name: string
    conditions: Record<string, unknown>
    isShared?: boolean
  }): Promise<ApiResponse<SearchTemplateVO>> {
    return request.post('/prospects/search-templates', data)
  },

  /** 更新搜索模板 */
  update(
    id: number,
    data: { name?: string; conditions?: Record<string, unknown>; isShared?: boolean },
  ): Promise<ApiResponse<SearchTemplateVO>> {
    return request.put(`/prospects/search-templates/${id}`, data)
  },

  /** 删除搜索模板 */
  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/prospects/search-templates/${id}`)
  },
}

/* ========== Filter Config API ========== */

export const filterConfigApi = {
  /** 获取筛选字段配置 */
  get(): Promise<ApiResponse<FilterConfigVO>> {
    return request.get('/prospects/filter-config')
  },

  /** 更新筛选字段配置 */
  update(data: {
    enabledFilters: string[]
    customFilters?: CustomFilterVO[]
  }): Promise<ApiResponse<FilterConfigVO>> {
    return request.put('/prospects/filter-config', data)
  },
}
