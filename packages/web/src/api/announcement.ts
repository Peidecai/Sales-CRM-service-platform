import request from './request'
import type { ApiResponse, PageResult } from './types'

export interface AnnouncementVO {
  id: number
  title: string
  content: string | null
  priority: string
  isPinned: boolean
  forceRead: boolean
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

export interface ReadStatsVO {
  totalUsers: number
  readCount: number
  readRate: number
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

  getUnread(): Promise<ApiResponse<AnnouncementVO[]>> {
    return request.get('/announcements/unread')
  },

  getForceUnread(): Promise<ApiResponse<AnnouncementVO[]>> {
    return request.get('/announcements/force-unread')
  },

  getReadStats(id: number): Promise<ApiResponse<ReadStatsVO>> {
    return request.get(`/announcements/${id}/read-stats`)
  },

  markRead(id: number): Promise<ApiResponse<void>> {
    return request.post(`/announcements/${id}/read`)
  },

  create(data: Partial<AnnouncementVO>): Promise<ApiResponse<AnnouncementVO>> {
    return request.post('/announcements', data)
  },

  update(id: number, data: Partial<AnnouncementVO>): Promise<ApiResponse<AnnouncementVO>> {
    return request.put(`/announcements/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<void>> {
    return request.delete(`/announcements/${id}`)
  },
}
