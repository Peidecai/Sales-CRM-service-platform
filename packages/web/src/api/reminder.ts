import request from './request'
import type { ApiResponse } from './types'

export interface ReminderSettingVO {
  id: number
  userId: number
  defaultReminderTime: string
  reminderEnabled: boolean
  aiReminderEnabled: boolean
  inactiveDaysThreshold: number
}

export const reminderApi = {
  /** 获取当前用户的提醒设置 */
  getSettings(): Promise<ApiResponse<ReminderSettingVO>> {
    return request.get('/follow-ups/reminder-settings')
  },

  /** 更新提醒设置 */
  updateSettings(
    data: Partial<Omit<ReminderSettingVO, 'id' | 'userId'>>,
  ): Promise<ApiResponse<ReminderSettingVO>> {
    return request.put('/follow-ups/reminder-settings', data)
  },
}
