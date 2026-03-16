/**
 * Customer API — mirrors PC web API signatures
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'
import { CustomerStatus } from '@crm/shared'

export { CustomerStatus }

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
  address: string | null
  region: string | null
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface CustomerQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: CustomerStatus
  assignedUserId?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

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

export type UpdateCustomerParams = Partial<CreateCustomerParams>

export const customerApi = {
  getList(params: CustomerQueryParams): Promise<ApiResponse<PageResult<CustomerVO>>> {
    return http.get('/customers', params as unknown as Record<string, unknown>)
  },

  getDetail(id: number): Promise<ApiResponse<CustomerVO>> {
    return http.get(`/customers/${id}`)
  },

  create(data: CreateCustomerParams): Promise<ApiResponse<CustomerVO>> {
    return http.post('/customers', data as unknown as Record<string, unknown>)
  },

  update(id: number, data: UpdateCustomerParams): Promise<ApiResponse<CustomerVO>> {
    return http.put(`/customers/${id}`, data as unknown as Record<string, unknown>)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return http.del(`/customers/${id}`)
  },
}
