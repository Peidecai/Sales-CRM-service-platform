import request from './request'

// Opportunity stage enum matching backend
export enum OpportunityStage {
  LEAD = 'lead',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

// Opportunity VO returned from backend
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

// Query params
export interface OpportunityQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  stage?: OpportunityStage
  customerId?: number
  assignedUserId?: number
}

// Create params
export interface CreateOpportunityParams {
  title: string
  customerId: number
  stage?: OpportunityStage
  amount?: number
  expectedCloseDate?: string
  probability?: number
  assignedUserId: number
  description?: string
}

// Update params (all optional)
export type UpdateOpportunityParams = Partial<CreateOpportunityParams>

// Update stage params
export interface UpdateStageParams {
  stage: OpportunityStage
}

// Stage statistics item
export interface OpportunityStageStats {
  stage: OpportunityStage
  count: number
  totalAmount: number
}

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

export const opportunityApi = {
  getList(params: OpportunityQueryParams): Promise<ApiResponse<PageResult<OpportunityVO>>> {
    return request.get('/opportunities', { params })
  },

  getDetail(id: number): Promise<ApiResponse<OpportunityVO>> {
    return request.get(`/opportunities/${id}`)
  },

  create(data: CreateOpportunityParams): Promise<ApiResponse<OpportunityVO>> {
    return request.post('/opportunities', data)
  },

  update(id: number, data: UpdateOpportunityParams): Promise<ApiResponse<OpportunityVO>> {
    return request.put(`/opportunities/${id}`, data)
  },

  updateStage(id: number, data: UpdateStageParams): Promise<ApiResponse<OpportunityVO>> {
    return request.put(`/opportunities/${id}/stage`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/opportunities/${id}`)
  },

  getStats(): Promise<ApiResponse<OpportunityStageStats[]>> {
    return request.get('/opportunities/stats')
  },
}
