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

export const checkInApi = {
  /**
   * Submit a field check-in (stub API — backend TODO)
   */
  create(data: CheckInParams): Promise<ApiResponse<CheckInVO>> {
    return http.post('/attendance/check-in', data as unknown as Record<string, unknown>)
  },

  /**
   * Get check-in history
   */
  getList(params: CheckInQueryParams): Promise<ApiResponse<PageResult<CheckInVO>>> {
    return http.get('/attendance/check-in', params as unknown as Record<string, unknown>)
  },
}
