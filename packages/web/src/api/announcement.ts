import request from './request'
import type { ApiResponse, PageResult } from './types'

export interface AnnouncementVO {
  id: number
  title: string
  content: string | null
  priority: string
  isPinned: boolean
  publishAt: string | null
  endAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnnouncementQueryParams {
  priority?: string
  isPinned?: boolean
  page?: number
  pageSize?: number
}

export const announcementApi = {
  list(params?: AnnouncementQueryParams): Promise<ApiResponse<PageResult<AnnouncementVO>>> {
    return request.get('/announcements', { params: params ?? {} })
  },

  get(id: number): Promise<ApiResponse<AnnouncementVO>> {
    return request.get(`/announcements/${id}`)
  },

  getUnreadCount(): Promise<ApiResponse<number>> {
    return request.get('/announcements/unread-count')
  },

  markRead(id: number): Promise<ApiResponse<void>> {
    return request.post(`/announcements/${id}/read`)
  },
}
