import request from './request'

export interface NotificationSettings {
  emailEnabled: boolean
  wsEnabled: boolean
  smsEnabled: boolean
  mutedTypes: string[]
  quietHoursStart: string | null
  quietHoursEnd: string | null
}

export function getNotificationSettings() {
  return request.get<NotificationSettings>('/notification/settings')
}

export function updateNotificationSettings(data: Partial<NotificationSettings>) {
  return request.put('/notification/settings', data)
}
