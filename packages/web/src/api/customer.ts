import request from './request'
import type { ApiResponse, PageResult } from './types'
import { CustomerStatus } from '@crm/shared'

export { CustomerStatus }

// Customer VO returned from backend
export interface CustomerVO {
  id: number
  name: string
  company: string | null
  phone: string | null
  email: string | null
  status: CustomerStatus
  assignedUserId: number
  notes: string | null
  tags: string[] | null
  industry: string | null
  source: string | null
  createdAt: string
  updatedAt: string
  deleted: boolean
}

// Query params
export interface CustomerQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: CustomerStatus
  assignedUserId?: number
}

// Create params
export interface CreateCustomerParams {
  name: string
  company?: string
  phone?: string
  email?: string
  status?: CustomerStatus
  assignedUserId: number
  notes?: string
  tags?: string[]
  industry?: string
  source?: string
}

// Update params (all optional)
export type UpdateCustomerParams = Partial<CreateCustomerParams>

// Import result
export interface ImportResult {
  imported: number
  errors: string[]
}

// Allocate params
export interface AllocateCustomerParams {
  assignedUserId: number
}

export const customerApi = {
  getList(params: CustomerQueryParams): Promise<ApiResponse<PageResult<CustomerVO>>> {
    return request.get('/customers', { params })
  },

  getDetail(id: number): Promise<ApiResponse<CustomerVO>> {
    return request.get(`/customers/${id}`)
  },

  create(data: CreateCustomerParams): Promise<ApiResponse<CustomerVO>> {
    return request.post('/customers', data)
  },

  update(id: number, data: UpdateCustomerParams): Promise<ApiResponse<CustomerVO>> {
    return request.put(`/customers/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/customers/${id}`)
  },

  /**
   * Export all customers as CSV.
   * Returns a Blob since the backend sends raw CSV (not JSON-wrapped).
   */
  async exportCsv(): Promise<Blob> {
    const response = await request.get('/customers/export', {
      responseType: 'blob',
    })
    // When responseType is 'blob', axios response.data is the Blob
    // But our interceptor returns response.data, so we get the Blob directly
    return response as unknown as Blob
  },

  /**
   * Import customers from parsed CSV rows.
   */
  importCsv(rows: Array<Record<string, string>>): Promise<ApiResponse<ImportResult>> {
    return request.post('/customers/import', { rows })
  },

  /**
   * Reassign a customer to a different sales user (ADMIN/MANAGER only).
   */
  allocate(id: number, data: AllocateCustomerParams): Promise<ApiResponse<CustomerVO>> {
    return request.put(`/customers/${id}/assign`, data)
  },
}
