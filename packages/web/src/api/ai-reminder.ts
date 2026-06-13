import request from './request'
import type { AiReminderType, AiReminderPriority, AiReminderFeedback } from '@crm/shared'

/* ---------- Types ---------- */

export interface ScoreDimensions {
  customerFit: number
  engagementLevel: number
  stageProgress: number
  sentimentTrend: number
  competitorRisk: number
}

export interface OpportunityScore {
  id: number
  opportunityId: number
  score: number
  dimensions: ScoreDimensions
  aiReasoning: string | null
  scoredAt: string
  createdAt: string
}

export interface AiReminderItem {
  id: number
  opportunityId: number | null
  customerId: number | null
  userId: number
  type: AiReminderType
  title: string
  content: string
  priority: AiReminderPriority
  isRead: boolean
  feedback: AiReminderFeedback | null
  feedbackAt: string | null
  scheduledAt: string | null
  createdAt: string
}

export interface CompetitorMentionItem {
  id: number
  callRecordId: number
  opportunityId: number | null
  competitorName: string
  context: string | null
  sentiment: string
  createdAt: string
}

export interface ReminderSummary {
  total: number
  [type: string]: number
}

/* ---------- Opportunity Scores ---------- */

export function scoreOpportunity(opportunityId: number) {
  return request.post<OpportunityScore>(`/opportunity-scores/${opportunityId}/score`)
}

export function enqueueScoring(opportunityId: number) {
  return request.post<{ message: string }>(`/opportunity-scores/${opportunityId}/enqueue`)
}

export function getScoreHistory(params: {
  opportunityId?: number
  page?: number
  pageSize?: number
}) {
  return request.get<{ list: OpportunityScore[]; total: number }>('/opportunity-scores/history', {
    params,
  })
}

export function getScoreDistribution(userId?: number) {
  return request.get<Record<string, number>>('/opportunity-scores/distribution', {
    params: userId ? { userId } : {},
  })
}

/* ---------- AI Reminders ---------- */

export function getReminders(params: {
  type?: AiReminderType
  opportunityId?: number
  priority?: string
  isRead?: boolean
  page?: number
  pageSize?: number
}) {
  return request.get<{ list: AiReminderItem[]; total: number; page: number; pageSize: number }>(
    '/ai-reminders',
    { params },
  )
}

export function getReminderSummary() {
  return request.get<ReminderSummary>('/ai-reminders/summary')
}

export function markReminderRead(id: number) {
  return request.put<AiReminderItem>(`/ai-reminders/${id}/read`)
}

export function markAllRemindersRead() {
  return request.put<{ message: string }>('/ai-reminders/read-all')
}

export function submitReminderFeedback(id: number, feedback: AiReminderFeedback) {
  return request.put<AiReminderItem>(`/ai-reminders/${id}/feedback`, { feedback })
}

export function generateNextActions(opportunityId: number) {
  return request.post<AiReminderItem | null>(`/ai-reminders/next-actions/${opportunityId}`)
}

export function getReminderAggregate() {
  return request.get<{
    unread: number
    byType: Record<string, number>
    recentReminders: AiReminderItem[]
  }>('/ai-reminders/aggregate')
}

/* ---------- Competitor Mentions ---------- */

export function getCompetitorMentions(params: {
  callRecordId?: number
  opportunityId?: number
  page?: number
  pageSize?: number
}) {
  return request.get<{ list: CompetitorMentionItem[]; total: number }>('/competitor-mentions', {
    params,
  })
}

export function detectCompetitors(callRecordId: number) {
  return request.post<CompetitorMentionItem[]>(`/competitor-mentions/detect/${callRecordId}`)
}

export function getTopCompetitors(limit = 10) {
  return request.get<Array<{ competitorName: string; count: number }>>('/competitor-mentions/top', {
    params: { limit },
  })
}
