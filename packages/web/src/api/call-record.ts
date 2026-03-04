import request from './request'

// Call record VO returned from backend
export interface CallRecordVO {
  id: number
  customerId: number
  opportunityId: number | null
  userId: number
  callAt: string
  duration: number
  notes: string | null
  aiSummary: string | null
  recordingUrl: string | null
  createdAt: string
  updatedAt: string
  deleted: boolean
}

// Query params
export interface CallRecordQueryParams {
  page?: number
  pageSize?: number
  customerId?: number
  opportunityId?: number
  userId?: number
  startDate?: string
  endDate?: string
}

// Create params
export interface CreateCallRecordParams {
  customerId: number
  opportunityId?: number
  userId: number
  callAt: string
  duration?: number
  notes?: string
  recordingUrl?: string
}

// Update params (all optional)
export type UpdateCallRecordParams = Partial<CreateCallRecordParams>

// Stats
export interface CallRecordStats {
  totalCount: number
  totalDuration: number
  weekCount: number
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

export const callRecordApi = {
  getList(params: CallRecordQueryParams): Promise<ApiResponse<PageResult<CallRecordVO>>> {
    return request.get('/call-records', { params })
  },

  getDetail(id: number): Promise<ApiResponse<CallRecordVO>> {
    return request.get(`/call-records/${id}`)
  },

  create(data: CreateCallRecordParams): Promise<ApiResponse<CallRecordVO>> {
    return request.post('/call-records', data)
  },

  update(id: number, data: UpdateCallRecordParams): Promise<ApiResponse<CallRecordVO>> {
    return request.put(`/call-records/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/call-records/${id}`)
  },

  getStats(userId?: number): Promise<ApiResponse<CallRecordStats>> {
    return request.get('/call-records/stats', { params: userId ? { userId } : {} })
  },
}
