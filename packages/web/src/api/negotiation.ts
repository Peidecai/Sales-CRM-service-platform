import request from './request'
import { type NegotiationStatus, type NegotiationOutcome } from '@crm/shared'

export interface NegotiationConcession {
  time: number
  type: string
  description: string
  impact: string
}

export interface NegotiationKeyMoment {
  time: number
  event: string
  analysis: string
}

export interface NegotiationAnalysis {
  id: number
  callRecordId: number
  customerId: number | null
  userId: number
  status: NegotiationStatus
  overallScore: number | null
  strategy: string | null
  concessions: NegotiationConcession[] | null
  keyMoments: NegotiationKeyMoment[] | null
  strengths: string[] | null
  weaknesses: string[] | null
  reNegotiationAdvice: string | null
  outcome: string | null
  summary: string | null
  createdAt: string
  updatedAt: string
}

export interface NegotiationDashboard {
  avgScore: number
  totalAnalyses: number
  winRate: number
  avgConcessions: number
  strategyDistribution: Array<{ strategy: string; count: string }>
  outcomeDistribution: Array<{ outcome: string; count: string }>
}

export interface NegotiationPatterns {
  won: {
    avgScore: number
    count: number
    topStrategies: Array<{ strategy: string; count: string }>
  }
  lost: {
    avgScore: number
    count: number
    topStrategies: Array<{ strategy: string; count: string }>
  }
}

export interface NegotiationListQuery {
  page?: number
  pageSize?: number
  status?: NegotiationStatus
  outcome?: NegotiationOutcome
  userId?: number
  customerId?: number
  startDate?: string
  endDate?: string
}

export interface DashboardQuery {
  startDate?: string
  endDate?: string
  userId?: number
}

export function getNegotiationList(params: NegotiationListQuery) {
  return request.get<{
    list: NegotiationAnalysis[]
    total: number
    page: number
    pageSize: number
  }>('/negotiation-analysis', { params })
}

export function getNegotiationDetail(id: number) {
  return request.get<NegotiationAnalysis>(`/negotiation-analysis/${id}`)
}

export function triggerNegotiationAnalysis(callRecordId: number) {
  return request.post<NegotiationAnalysis>('/negotiation-analysis', { callRecordId })
}

export function deleteNegotiationAnalysis(id: number) {
  return request.delete(`/negotiation-analysis/${id}`)
}

export function generateReNegotiationAdvice(id: number) {
  return request.post<NegotiationAnalysis>(`/negotiation-analysis/${id}/re-negotiate`)
}

export function getNegotiationDashboard(params?: DashboardQuery) {
  return request.get<NegotiationDashboard>('/negotiation-analysis/dashboard', { params })
}

export function getNegotiationPatterns(params?: DashboardQuery) {
  return request.get<NegotiationPatterns>('/negotiation-analysis/patterns', { params })
}

export function exportNegotiationCsv(params?: DashboardQuery) {
  return request.get('/negotiation-analysis/export', {
    params,
    responseType: 'blob',
  })
}
