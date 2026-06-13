import request from './request'
import type { ApiResponse } from './types'
import { AnalysisStatus, AnalysisType, AnalysisInputSource } from '@crm/shared'

// Types
export interface AiAnalysisConfigVO {
  id: number
  callAnalysisEnabled: boolean
  customerClassifyEnabled: boolean
  speechScoringEnabled: boolean
  knowledgeCompareEnabled: boolean
  autoCreateOpportunity: boolean
  chatModel: string
  embeddingModel: string
  callAnalysisPrompt: string | null
  customerClassifyPrompt: string | null
  speechScoringPrompt: string | null
  classifyRules: ClassifyRule[] | null
  updatedBy: number | null
  updatedAt: string
}

export interface ClassifyRule {
  label: string
  customerStatus: string
  createOpportunity: boolean
  tags: string[]
}

export interface CallAnalysisResultVO {
  id: number
  callRecordId: number
  customerId: number | null
  analysisType: AnalysisType
  inputSource: AnalysisInputSource
  customerClassify: string | null
  classifyConfidence: number | null
  suggestedStatus: string | null
  suggestedTags: string[] | null
  speechScore: number | null
  speechFeedback: string | null
  knowledgeMatchRate: number | null
  knowledgeGaps: string[] | null
  summary: string | null
  opportunityCreated: boolean
  opportunityId: number | null
  appliedAt: string | null
  manualNote: string | null
  status: AnalysisStatus
  createdAt: string
}

export interface DefaultPromptsVO {
  callAnalysisPrompt: string
  customerClassifyPrompt: string
  speechScoringPrompt: string
}

export interface CustomerCallSummaryVO {
  totalCalls: number
  totalAnalyzed: number
  avgSpeechScore: number | null
  avgKnowledgeMatchRate: number | null
  speechScoreTrend: { date: string; score: number }[]
  knowledgeCoverageTrend: { date: string; rate: number }[]
  topClassifications: { label: string; count: number }[]
  overallSummary: string | null
}

// API objects
export interface DealAnalysisVO {
  analyses: CallAnalysisResultVO[]
  intentTrend: { date: string; classify: string | null; confidence: number | null }[]
  summary: { total: number; avgSpeechScore: number | null; avgConfidence: number | null }
}

export const analysisConfigApi = {
  get: (): Promise<ApiResponse<AiAnalysisConfigVO>> => request.get('/ai/analysis-config'),
  update: (data: Partial<AiAnalysisConfigVO>): Promise<ApiResponse<AiAnalysisConfigVO>> =>
    request.put('/ai/analysis-config', data),
  getDefaultPrompts: (): Promise<ApiResponse<DefaultPromptsVO>> =>
    request.get('/ai/analysis-config/default-prompts'),
}

export const callAnalysisApi = {
  trigger: (callRecordId: number): Promise<ApiResponse<CallAnalysisResultVO>> =>
    request.post(`/ai/call-analysis/${callRecordId}`),
  getResult: (callRecordId: number): Promise<ApiResponse<CallAnalysisResultVO>> =>
    request.get(`/ai/call-analysis/${callRecordId}`),
  getList: (
    params: Record<string, unknown>,
  ): Promise<
    ApiResponse<{
      list: CallAnalysisResultVO[]
      total: number
      page: number
      pageSize: number
      tabs?: { total: number; analyzed: number; pending: number }
    }>
  > => request.get('/ai/call-analysis', { params }),
  addNote: (resultId: number, note: string): Promise<ApiResponse<CallAnalysisResultVO>> =>
    request.put(`/ai/call-analysis/${resultId}/note`, { note }),
  apply: (resultId: number): Promise<ApiResponse<CallAnalysisResultVO>> =>
    request.post(`/ai/call-analysis/${resultId}/apply`),
  getLatestByCustomer: (customerId: number): Promise<ApiResponse<CallAnalysisResultVO>> =>
    request.get(`/ai/call-analysis/customer/${customerId}/latest`),
  getCustomerCallSummary: (customerId: number): Promise<ApiResponse<CustomerCallSummaryVO>> =>
    request.get(`/ai/call-analysis/customer/${customerId}/summary`),
  getDealAnalysis: (opportunityId: number): Promise<ApiResponse<DealAnalysisVO>> =>
    request.get(`/ai/deal-analysis/${opportunityId}`),
  exportList: (
    params: Record<string, unknown>,
  ): Promise<ApiResponse<{ list: CallAnalysisResultVO[]; total: number }>> =>
    request.get('/ai/call-analysis/export', { params }),
}
