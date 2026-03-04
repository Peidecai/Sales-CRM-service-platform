import request from './request'

// Customer status enum matching backend
export enum CustomerStatus {
  POTENTIAL = 'potential',
  FOLLOWING = 'following',
  NEGOTIATING = 'negotiating',
  SIGNED = 'signed',
  LOST = 'lost',
  INACTIVE = 'inactive',
}

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

// API response wrapper
export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

// Paginated result
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
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
}
