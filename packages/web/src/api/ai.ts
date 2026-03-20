import request from './request'

// ---- Customer Profiles (#122, #129) ----
export interface CustomerProfileVO {
  id: number
  customerId: number
  discType: string | null
  discScores: { D: number; I: number; S: number; C: number } | null
  communicationStyle: string | null
  painPoints: string[] | null
  healthScore: number | null
  rawAnalysis: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export function getCustomerProfile(customerId: number) {
  return request.get(`/ai/customer-profiles/${customerId}`)
}

export function generateCustomerProfile(customerId: number) {
  return request.post(`/ai/customer-profiles/${customerId}/generate`)
}

// ---- Intent Predictions (#123) ----
export interface IntentPredictionVO {
  id: number
  customerId: number
  opportunityId: number | null
  purchaseProbability: number
  predictedCloseDate: string | null
  positiveSignals: string[] | null
  negativeSignals: string[] | null
  updatedAt: string
}

export function getIntentPredictions(params: { customerId?: number; opportunityId?: number }) {
  return request.get('/ai/intent-predictions', { params })
}

export function generateIntentPrediction(params: { customerId: number; opportunityId?: number }) {
  return request.post('/ai/intent-predictions/generate', null, { params })
}

// ---- Alerts (#124, #131) ----
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved'

export interface AiAlertVO {
  id: number
  customerId: number | null
  opportunityId: number | null
  alertType: string
  title: string
  detail: Record<string, unknown> | null
  status: AlertStatus
  createdAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

export function getAlerts(params: {
  status?: AlertStatus
  alertType?: string
  page?: number
  pageSize?: number
}) {
  return request.get('/ai/alerts', { params })
}

export function acknowledgeAlert(id: number) {
  return request.put(`/ai/alerts/${id}/acknowledge`)
}

export function resolveAlert(id: number) {
  return request.put(`/ai/alerts/${id}/resolve`)
}

// ---- Reports (#125, #132) ----
export type ReportType = 'weekly' | 'monthly'

export interface AiReportVO {
  id: number
  reportType: ReportType
  periodValue: string
  content: Record<string, unknown> | null
  fileUrl: string | null
  createdBy: number | null
  createdAt: string
}

export function getReports(params: {
  reportType?: ReportType
  periodValue?: string
  page?: number
  pageSize?: number
}) {
  return request.get('/ai/reports', { params })
}

export function generateReport(params: { reportType: ReportType; periodValue: string }) {
  return request.post('/ai/reports/generate', null, { params })
}

// ---- Sales Forecasts (#126, #130) ----
export type ForecastPeriodType = '1month' | '3month' | '6month'

export interface SalesForecastVO {
  id: number
  periodType: ForecastPeriodType
  periodValue: string
  forecastAmount: number
  confidenceLow: number
  confidenceHigh: number
  assumptions: Record<string, unknown> | null
  updatedAt: string
}

export function getSalesForecasts(params?: { periodType?: ForecastPeriodType }) {
  return request.get('/ai/sales-forecasts', { params })
}

export function generateSalesForecast(params: { periodType: ForecastPeriodType }) {
  return request.post('/ai/sales-forecasts/generate', null, { params })
}

// ---- Competitor Reports (#127) ----
export interface CompetitorReportVO {
  id: number
  customerId: number | null
  opportunityId: number | null
  competitorName: string
  winLose: string | null
  summary: string | null
  mentionedAt: string | null
  createdAt: string
}

export interface CompetitorSummaryVO {
  competitorName: string
  mentionCount: number
  winCount: number
  loseCount: number
}

export function getCompetitorReports(params: {
  customerId?: number
  opportunityId?: number
  page?: number
  pageSize?: number
}) {
  return request.get('/ai/competitor-reports', { params })
}

export function getCompetitorSummary() {
  return request.get('/ai/competitor-reports/summary')
}

// ---- Script Recommend (#128) ----
export interface ScriptItem {
  scene: string
  content: string
  tip: string
}

export function getScriptRecommend(params: { customerId: number; opportunityId?: number }) {
  return request.get('/ai/script-recommend', { params })
}

// ---- Usage ----
export function getAiUsage() {
  return request.get('/ai/usage')
}

// ---- Copilot ----
export function copilotChat(data: { message: string; context?: string }) {
  return request.post<{ reply: string }>('/ai/copilot/chat', data)
}

export function copilotQueryCrm(data: { query: string }) {
  return request.post('/ai/copilot/query-crm', data)
}

export function getSuggestFollowUps(opportunityId: number) {
  return request.get(`/ai/copilot/suggest-follow-ups/${opportunityId}`)
}

// ---- Employee Profile ----
export interface EmployeeRadarProfileVO {
  userId: number
  communication: number
  professionalism: number
  execution: number
  satisfaction: number
  closeRate: number
}

export interface GrowthPointVO {
  month: string
  communication: number
  professionalism: number
  execution: number
  satisfaction: number
  closeRate: number
}

export interface BenchmarkComparisonVO {
  userId: number
  user: EmployeeRadarProfileVO
  teamAverage: EmployeeRadarProfileVO
}

export function getEmployeeProfile(userId: number) {
  return request.get<EmployeeRadarProfileVO>(`/ai/employee-profile/${userId}`)
}

export function getEmployeeGrowth(userId: number, months?: number) {
  return request.get<GrowthPointVO[]>(`/ai/employee-profile/${userId}/growth`, {
    params: months ? { months } : undefined,
  })
}

export function getEmployeeBenchmark(userId: number) {
  return request.get<BenchmarkComparisonVO>(`/ai/employee-profile/${userId}/benchmark`)
}

// ---- Customer Profile Enhanced ----
export interface NextBestActionVO {
  action: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface ChurnRiskVO {
  customerId: number
  riskScore: number
  factors: string[]
}

export interface BestContactTimeVO {
  customerId: number
  bestHours: { hour: number; successRate: number }[]
  bestDayOfWeek: { day: number; successRate: number }[]
}

export function getNextBestAction(customerId: number) {
  return request.get<NextBestActionVO[]>(`/ai/customer-profile/${customerId}/nba`)
}

export function getChurnRisk(customerId: number) {
  return request.get<ChurnRiskVO>(`/ai/customer-profile/${customerId}/churn-risk`)
}

export function getBestContactTime(customerId: number) {
  return request.get<BestContactTimeVO>(`/ai/customer-profile/${customerId}/best-contact-time`)
}

// ---- Article Versions ----
export interface ArticleVersionVO {
  id: number
  articleId: number
  version: number
  title: string
  content: string
  editedById: number
  createdAt: string
}

export function getArticleVersions(articleId: number) {
  return request.get<ArticleVersionVO[]>(`/knowledge/articles/${articleId}/versions`)
}

export function getArticleVersion(versionId: number) {
  return request.get<ArticleVersionVO>(`/knowledge/versions/${versionId}`)
}

export function diffArticleVersions(v1Id: number, v2Id: number) {
  return request.get(`/knowledge/versions/diff`, { params: { v1: v1Id, v2: v2Id } })
}
