import request from './request'
import type { ApiResponse, PageResult } from './types'

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
  customerId: number
  userId?: number
  type?: FollowUpType
  page?: number
  pageSize?: number
}

export const followUpApi = {
  getList(params: QueryFollowUpParams): Promise<ApiResponse<PageResult<FollowUpVO>>> {
    return request.get('/follow-ups', { params })
  },

  create(data: CreateFollowUpParams): Promise<ApiResponse<FollowUpVO>> {
    return request.post('/follow-ups', data)
  },

  update(id: number, data: UpdateFollowUpParams): Promise<ApiResponse<FollowUpVO>> {
    return request.put(`/follow-ups/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/follow-ups/${id}`)
  },
}
