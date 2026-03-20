/**
 * Push notification API
 */
import { http } from './request'
import type { ApiResponse } from '@crm/shared'

export interface DeviceRegistration {
  id: number
  deviceToken: string
  platform: string
  userId: number
  createdAt: string
}

export const pushApi = {
  /**
   * Register device for push notifications
   */
  registerDevice(
    deviceToken: string,
    platform: string,
  ): Promise<ApiResponse<DeviceRegistration>> {
    return http.post('/push/register', { deviceToken, platform })
  },

  /**
   * Unregister device from push notifications
   */
  unregisterDevice(deviceToken: string): Promise<ApiResponse<null>> {
    return http.post('/push/unregister', { deviceToken })
  },
}
