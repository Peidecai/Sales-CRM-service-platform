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

export interface UnreadCountByType {
  total: number
  system: number
  task: number
  follow_up: number
  opportunity: number
  mention: number
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

  /**
   * Get unread counts grouped by notification type.
   * Falls back to fetching individual type counts if backend
   * doesn't support the grouped endpoint.
   */
  async getUnreadCountByType(): Promise<UnreadCountByType> {
    try {
      const res = await http.get<UnreadCountByType>('/notifications/unread-count-by-type')
      if (res.code === 0 && res.data) {
        return res.data
      }
    } catch {
      // Endpoint may not exist, fall back to total count
    }

    // Fallback: get total count and distribute as total only
    try {
      const res = await http.get<{ count: number }>('/notifications/unread-count')
      if (res.code === 0 && res.data) {
        return {
          total: res.data.count,
          system: 0,
          task: 0,
          follow_up: 0,
          opportunity: 0,
          mention: 0,
        }
      }
    } catch {
      // ignore
    }

    return { total: 0, system: 0, task: 0, follow_up: 0, opportunity: 0, mention: 0 }
  },
}
