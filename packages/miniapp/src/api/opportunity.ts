/**
 * Opportunity API — mirrors PC web API signatures
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'
import { OpportunityStage } from '@crm/shared'

export { OpportunityStage }

export interface OpportunityVO {
  id: number
  title: string
  customerId: number
  stage: OpportunityStage
  amount: number
  expectedCloseDate: string | null
  probability: number
  assignedUserId: number
  description: string | null
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface OpportunityQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  stage?: OpportunityStage
  customerId?: number
  assignedUserId?: number
}

export interface CreateOpportunityParams {
  title: string
  customerId: number
  stage?: OpportunityStage
  amount: number
  probability?: number
  expectedCloseDate?: string
  source?: string
  description?: string
}

export type UpdateOpportunityParams = Partial<CreateOpportunityParams>

export const opportunityApi = {
  getList(params: OpportunityQueryParams): Promise<ApiResponse<PageResult<OpportunityVO>>> {
    return http.get('/opportunities', params as unknown as Record<string, unknown>)
  },

  getDetail(id: number): Promise<ApiResponse<OpportunityVO>> {
    return http.get(`/opportunities/${id}`)
  },

  getStats() {
    return http.get('/opportunities/stats')
  },

  create(data: CreateOpportunityParams): Promise<ApiResponse<OpportunityVO>> {
    return http.post('/opportunities', data as unknown as Record<string, unknown>)
  },

  update(id: number, data: UpdateOpportunityParams): Promise<ApiResponse<OpportunityVO>> {
    return http.put(`/opportunities/${id}`, data as unknown as Record<string, unknown>)
  },
}
