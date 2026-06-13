/**
 * Follow-up API — mirrors PC web API signatures
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'

export enum FollowUpType {
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  WECHAT = 'wechat',
  OTHER = 'other',
}

export interface FollowUpVO {
  id: number
  customerId: number
  userId: number
  type: FollowUpType
  content: string
  nextFollowUpDate: string | null
  nextFollowUpNote: string | null
  createdAt: string
  updatedAt: string
  deleted: boolean
  user?: {
    id: number
    username: string
    realName?: string
  }
}

export interface CreateFollowUpParams {
  customerId: number
  type: FollowUpType
  content: string
  nextFollowUpDate?: string
  nextFollowUpNote?: string
}

export type UpdateFollowUpParams = Partial<Omit<CreateFollowUpParams, 'customerId'>>

export interface QueryFollowUpParams {
  customerId?: number
  userId?: number
  type?: FollowUpType
  page?: number
  pageSize?: number
  nextFollowUpDate?: string
}

export const followUpApi = {
  getList(params: QueryFollowUpParams): Promise<ApiResponse<PageResult<FollowUpVO>>> {
    return http.get('/follow-ups', params as unknown as Record<string, unknown>)
  },

  create(data: CreateFollowUpParams): Promise<ApiResponse<FollowUpVO>> {
    return http.post('/follow-ups', data as unknown as Record<string, unknown>)
  },

  update(id: number, data: UpdateFollowUpParams): Promise<ApiResponse<FollowUpVO>> {
    return http.put(`/follow-ups/${id}`, data as unknown as Record<string, unknown>)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return http.del(`/follow-ups/${id}`)
  },
}
