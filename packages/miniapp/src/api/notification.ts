/**
 * Notification API — message center
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'
import { NotificationType } from '@crm/shared'

export { NotificationType }

export interface NotificationVO {
  id: number
  userId: number
  type: NotificationType
  title: string
  content: string
  isRead: boolean
  relatedId: number | null
  relatedType: string | null
  createdAt: string
}

export interface NotificationQueryParams {
  page?: number
  pageSize?: number
  isRead?: boolean
  type?: NotificationType
}

export const notificationApi = {
  getList(params: NotificationQueryParams): Promise<ApiResponse<PageResult<NotificationVO>>> {
    return http.get('/notifications', params as unknown as Record<string, unknown>)
  },

  markRead(id: number): Promise<ApiResponse<null>> {
    return http.put(`/notifications/${id}/read`)
  },

  markAllRead(): Promise<ApiResponse<null>> {
    return http.put('/notifications/read-all')
  },

  getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return http.get('/notifications/unread-count')
  },
}
