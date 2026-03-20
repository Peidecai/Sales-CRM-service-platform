/**
 * Check-in API — field attendance
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'

export interface CheckInParams {
  customerId: number
  latitude: number
  longitude: number
  address: string
  photoUrl?: string
  remark?: string
}

export interface CheckInVO {
  id: number
  userId: number
  customerId: number
  customerName?: string
  latitude: number
  longitude: number
  address: string
  photoUrl: string | null
  distance: number
  remark: string | null
  createdAt: string
}

export interface CheckInQueryParams {
  page?: number
  pageSize?: number
  userId?: number
  customerId?: number
  startDate?: string
  endDate?: string
}

export interface CheckInStats {
  todayCount: number
  weekCount: number
  monthCount: number
}

export const checkInApi = {
  /**
   * Submit a field check-in
   */
  create(data: CheckInParams): Promise<ApiResponse<CheckInVO>> {
    return http.post('/check-in', data as unknown as Record<string, unknown>)
  },

  /**
   * Get check-in history
   */
  getList(params: CheckInQueryParams): Promise<ApiResponse<PageResult<CheckInVO>>> {
    return http.get('/check-in', params as unknown as Record<string, unknown>)
  },

  /**
   * Get check-in statistics (today/week/month counts)
   */
  getStats(): Promise<ApiResponse<CheckInStats>> {
    return http.get('/check-in/stats')
  },
}
