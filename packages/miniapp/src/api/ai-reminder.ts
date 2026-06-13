/**
 * AI Reminder API — mobile reminder endpoints
 */
import { http } from './request'
import type { AiReminderType, AiReminderFeedback } from '@crm/shared'

export interface AiReminderItem {
  id: number
  opportunityId: number | null
  customerId: number | null
  userId: number
  type: AiReminderType
  title: string
  content: string
  priority: string
  isRead: boolean
  feedback: AiReminderFeedback | null
  feedbackAt: string | null
  scheduledAt: string | null
  createdAt: string
}

export const aiReminderApi = {
  /** Get reminder list */
  getReminders(params?: {
    type?: AiReminderType
    isRead?: boolean
    page?: number
    pageSize?: number
  }) {
    return http.get<{ list: AiReminderItem[]; total: number; page: number; pageSize: number }>(
      '/ai-reminders',
      params as Record<string, unknown>,
    )
  },

  /** Mark a reminder as read */
  markRead(id: number) {
    return http.put<AiReminderItem>(`/ai-reminders/${id}/read`)
  },

  /** Submit feedback */
  submitFeedback(id: number, feedback: AiReminderFeedback) {
    return http.put<AiReminderItem>(`/ai-reminders/${id}/feedback`, {
      feedback,
    } as Record<string, unknown>)
  },

  /** Mark all as read */
  markAllRead() {
    return http.put<{ message: string }>('/ai-reminders/read-all')
  },
}
