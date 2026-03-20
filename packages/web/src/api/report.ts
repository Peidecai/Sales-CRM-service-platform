import request from './request'

export interface ReportFilter {
  startDate?: string
  endDate?: string
  departmentId?: number
  userId?: number
  groupBy?: 'day' | 'week' | 'month'
  topN?: number
}

// ─── Call Reports ─────────────────────────────────────────────────────

export function getCallStatistics(params: ReportFilter) {
  return request.get('/reports/call/statistics', { params })
}

export function getCallDailyAnalysis(params: ReportFilter) {
  return request.get('/reports/call/daily', { params })
}

export function getCallPersonalAnalysis(userId: number, params: ReportFilter) {
  return request.get(`/reports/call/personal/${userId}`, { params })
}

export function getCallDetailAnalysis(params: ReportFilter) {
  return request.get('/reports/call/detail', { params })
}

// ─── Performance Reports ──────────────────────────────────────────────

export function getPerformanceSummary(params: ReportFilter) {
  return request.get('/reports/performance/summary', { params })
}

export function getPerformanceSigning(params: ReportFilter) {
  return request.get('/reports/performance/signing', { params })
}

export function getPerformanceCollection(params: ReportFilter) {
  return request.get('/reports/performance/collection', { params })
}

export function getPerformanceOverview(params: ReportFilter) {
  return request.get('/reports/performance/overview', { params })
}

export function getPerformanceTarget(params: ReportFilter) {
  return request.get('/reports/performance/target', { params })
}

// ─── AI Reports ───────────────────────────────────────────────────────

export function getAiSpeechSkill(params: ReportFilter) {
  return request.get('/reports/ai/speech-skill', { params })
}

export function getAiScoreRanking(params: ReportFilter) {
  return request.get('/reports/ai/score-ranking', { params })
}

export function getAiEmployeePortrait(userId: number, params: ReportFilter) {
  return request.get(`/reports/ai/employee-portrait/${userId}`, { params })
}

export function getAiTagStatistics(params: ReportFilter) {
  return request.get('/reports/ai/tags', { params })
}

// ─── Funnel Reports ─────────────────────────────────────────────────

export function getSalesFunnel(params: ReportFilter) {
  return request.get('/reports/funnel/sales', { params })
}

export function getStageConversion(params: ReportFilter) {
  return request.get('/reports/funnel/stage-conversion', { params })
}

export function getVisitStatistics(params: ReportFilter) {
  return request.get('/reports/funnel/visits', { params })
}

// ─── Big Screens ────────────────────────────────────────────────────

export function getPerformanceScreen() {
  return request.get('/reports/screen/performance')
}

export function getCockpitScreen() {
  return request.get('/reports/screen/cockpit')
}
