import request from './request'
import type { ApiResponse } from './types'

export interface LeaderReviewVO {
  id: number
  callRecordId: number
  customerId: number | null
  reviewerId: number
  content: string
  createdAt: string
}

export const leaderReviewApi = {
  create: (
    callRecordId: number,
    data: { content: string; customerId?: number },
  ): Promise<ApiResponse<LeaderReviewVO>> =>
    request.post(`/call-records/${callRecordId}/reviews`, data),
  getByCallRecord: (callRecordId: number): Promise<ApiResponse<LeaderReviewVO[]>> =>
    request.get(`/call-records/${callRecordId}/reviews`),
  getByCustomer: (
    customerId: number,
    params?: { page?: number; pageSize?: number },
  ): Promise<ApiResponse<{ list: LeaderReviewVO[]; total: number }>> =>
    request.get(`/customers/${customerId}/reviews`, { params }),
}
