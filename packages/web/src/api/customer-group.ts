import request from './request'
import type { ApiResponse, PageResult } from './types'
import type { GroupRule } from '@crm/shared'

/* ========== VO 接口 ========== */

export interface CustomerGroupVO {
  id: number
  name: string
  description: string | null
  type: 'static' | 'dynamic'
  rules: GroupRule[] | null
  memberCount: number
  lastRefreshedAt: string | null
  createdById: number
  createdAt: string
  updatedAt: string
}

export interface CustomerGroupMemberVO {
  id: number
  name: string
  company: string
  phone: string
  email: string
  status: string
  industry: string
  region: string
  assignedUserId: number
}

export interface GroupAnalyticsVO {
  memberCount: number
  statusDistribution: Record<string, number>
  industryDistribution: Record<string, number>
}

/* ========== 查询参数 ========== */

export interface GroupQueryParams {
  page?: number
  pageSize?: number
}

export interface CreateGroupParams {
  name: string
  description?: string
  type: 'static' | 'dynamic'
  rules?: GroupRule[]
}

export interface UpdateGroupParams {
  name?: string
  description?: string
  rules?: GroupRule[]
}

/* ========== API ========== */

export const customerGroupApi = {
  getList(params: GroupQueryParams): Promise<ApiResponse<PageResult<CustomerGroupVO>>> {
    return request.get('/customer-groups', { params })
  },

  getDetail(id: number): Promise<ApiResponse<CustomerGroupVO>> {
    return request.get(`/customer-groups/${id}`)
  },

  create(data: CreateGroupParams): Promise<ApiResponse<CustomerGroupVO>> {
    return request.post('/customer-groups', data)
  },

  update(id: number, data: UpdateGroupParams): Promise<ApiResponse<CustomerGroupVO>> {
    return request.put(`/customer-groups/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/customer-groups/${id}`)
  },

  getMembers(
    id: number,
    params: GroupQueryParams,
  ): Promise<ApiResponse<PageResult<CustomerGroupMemberVO>>> {
    return request.get(`/customer-groups/${id}/members`, { params })
  },

  addMembers(id: number, customerIds: number[]): Promise<ApiResponse<{ success: boolean }>> {
    return request.post(`/customer-groups/${id}/members`, { customerIds })
  },

  removeMembers(id: number, customerIds: number[]): Promise<ApiResponse<{ success: boolean }>> {
    return request.delete(`/customer-groups/${id}/members`, { data: { customerIds } })
  },

  refresh(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return request.post(`/customer-groups/${id}/refresh`)
  },

  batchAction(
    id: number,
    action: 'transfer' | 'tag' | 'notify',
    params: Record<string, unknown>,
  ): Promise<ApiResponse<{ affected: number }>> {
    return request.post(`/customer-groups/${id}/batch-action`, { action, params })
  },

  getAnalytics(id: number): Promise<ApiResponse<GroupAnalyticsVO>> {
    return request.get(`/customer-groups/${id}/analytics`)
  },
}
