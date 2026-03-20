import request from './request'
import type { ApiResponse, PageResult } from './types'
import { ProspectStatus, ProspectChannel } from '@crm/shared'

export { ProspectStatus, ProspectChannel }

/* ========== VO 接口 ========== */

export interface ProspectVO {
  id: number
  companyName: string
  legalPerson: string | null
  registeredCapital: string | null
  establishDate: string | null
  industry: string | null
  province: string | null
  city: string | null
  address: string | null
  unifiedCreditCode: string | null
  phone: string | null
  email: string | null
  website: string | null
  employeeCount: number | null
  businessScope: string | null
  channel: ProspectChannel
  status: ProspectStatus
  remark: string | null
  assignedUserId: number | null
  convertedCustomerId: number | null
  convertedAt: string | null
  searchBatchId: string | null
  createdAt: string
  updatedAt: string
}

export interface ProspectSearchResultVO {
  companyName: string
  legalPerson?: string
  registeredCapital?: string
  establishDate?: string
  industry?: string
  province?: string
  city?: string
  address?: string
  unifiedCreditCode?: string
  phone?: string
  email?: string
  website?: string
  employeeCount?: number
  businessScope?: string
  channel: string
  isDuplicate: boolean
  existingCustomerId?: number
}

export interface ProspectStatsVO {
  total: number
  newCount: number
  contactedCount: number
  qualifiedCount: number
  convertedCount: number
  rejectedCount: number
  conversionRate: number
}

export interface ProspectSearchLogVO {
  id: number
  userId: number
  channel: ProspectChannel
  query: Record<string, unknown>
  resultCount: number
  importedCount: number
  cost: number
  status: string
  createdAt: string
}

/* ========== 查询参数 ========== */

export interface ProspectQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: ProspectStatus
  channel?: ProspectChannel
  industry?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ProspectSearchParams {
  keyword?: string
  industry?: string
  province?: string
  city?: string
  minRegisteredCapital?: number
  maxRegisteredCapital?: number
  minEmployeeCount?: number
  maxEmployeeCount?: number
  page?: number
  pageSize?: number
}

/* ========== API ========== */

export const prospectApi = {
  /** 搜索外部企业数据 */
  search(
    data: ProspectSearchParams,
  ): Promise<ApiResponse<{ results: ProspectSearchResultVO[]; total: number }>> {
    return request.post('/prospects/search', data)
  },

  /** 将搜索结果导入到线索池 */
  importToPool(
    results: ProspectSearchResultVO[],
  ): Promise<ApiResponse<{ imported: number; skipped: number }>> {
    return request.post('/prospects/import', { results })
  },

  /** 线索池列表 */
  getList(params: ProspectQueryParams): Promise<ApiResponse<PageResult<ProspectVO>>> {
    return request.get('/prospects', { params })
  },

  /** 线索详情 */
  getDetail(id: number): Promise<ApiResponse<ProspectVO>> {
    return request.get(`/prospects/${id}`)
  },

  /** 更新线索 */
  update(
    id: number,
    data: { status?: ProspectStatus; remark?: string; assignedUserId?: number },
  ): Promise<ApiResponse<ProspectVO>> {
    return request.put(`/prospects/${id}`, data)
  },

  /** 批量转化为客户 */
  convert(data: {
    prospectIds: number[]
    assignedUserId?: number
  }): Promise<ApiResponse<{ convertedCount: number; customerIds: number[] }>> {
    return request.post('/prospects/convert', data)
  },

  /** 批量操作 */
  batchOperate(data: {
    ids: number[]
    action: 'assign' | 'reject' | 'delete'
    assignedUserId?: number
  }): Promise<ApiResponse<{ affected: number }>> {
    return request.post('/prospects/batch', data)
  },

  /** 删除线索 */
  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/prospects/${id}`)
  },

  /** 统计数据 */
  getStats(): Promise<ApiResponse<ProspectStatsVO>> {
    return request.get('/prospects/stats')
  },

  /** 搜索历史 */
  getSearchHistory(): Promise<ApiResponse<ProspectSearchLogVO[]>> {
    return request.get('/prospects/search-history')
  },

  /** 查询历史 */
  getQueryHistory(params?: {
    page?: number
    pageSize?: number
  }): Promise<
    ApiResponse<
      PageResult<{
        id: number
        queryParams: Record<string, unknown>
        resultCount: number
        createdAt: string
      }>
    >
  > {
    return request.get('/prospects/query-history', { params: params ?? {} })
  },

  /** 删除查询历史 */
  deleteQueryHistory(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/prospects/query-history/${id}`)
  },

  /** 下载导入模板 */
  downloadImportTemplate(): Promise<Blob> {
    return request.get('/prospects/import-template', { responseType: 'blob' })
  },

  /** 导入 Excel 为线索 */
  importExcel(file: File): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/prospects/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 导入 Excel 直接为客户 */
  importAsCustomer(file: File): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/prospects/import-as-customer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 导出线索为 Excel */
  exportExcel(): Promise<Blob> {
    return request.get('/prospects/export', { responseType: 'blob' })
  },
}
