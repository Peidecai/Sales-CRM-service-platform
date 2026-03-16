/**
 * Call Record API — 通话记录 CRUD + AI 分析
 */
import { http, BASE_URL, TOKEN_KEY } from './request'
import type { ApiResponse } from '@crm/shared'

export interface CallRecordVO {
  id: number
  customerId: number
  opportunityId: number | null
  userId: number
  callAt: string
  duration: number
  notes: string | null
  aiSummary: string | null
  recordingUrl: string | null
  callType: string
  callResult: string | null
  estimatedDuration: number | null
  customer?: { id: number; name: string }
  createdAt: string
}

export interface CreateCallRecordParams {
  customerId: number
  userId: number
  callAt: string
  duration?: number
  notes?: string
  callType?: 'normal' | 'manual' | 'callback'
  callResult?: 'connected' | 'no_answer' | 'busy' | 'power_off'
  estimatedDuration?: number
}

export interface CallAnalysisResultVO {
  id: number
  callRecordId: number
  summary: string | null
  customerClassify: string | null
  classifyConfidence: number | null
  suggestedTags: string[] | null
  speechScore: number | null
  speechFeedback: string | null
  confidenceNote: string | null
  status: string
  inputSource: string
  createdAt: string
}

export const callRecordApi = {
  /** 获取通话记录列表 */
  getList(params: {
    customerId?: number
    page?: number
    pageSize?: number
    callType?: string
    callResult?: string
  }) {
    return http.get<{ list: CallRecordVO[]; total: number; page: number; pageSize: number }>(
      '/call-records',
      params as Record<string, unknown>,
    )
  },

  /** 创建通话记录 */
  create(data: CreateCallRecordParams) {
    return http.post<CallRecordVO>('/call-records', data as Record<string, unknown>)
  },

  /** 获取通话记录详情 */
  getDetail(id: number) {
    return http.get<CallRecordVO>(`/call-records/${id}`)
  },

  /** 触发 AI 分析 */
  summarize(id: number) {
    return http.post<{ jobId: string }>(`/call-records/${id}/summarize`)
  },

  /** 获取 AI 分析结果 */
  getAnalysis(id: number) {
    return http.get<CallAnalysisResultVO>(`/call-analysis/result/${id}`)
  },

  /** 上传语音速记录音 */
  uploadRecording(filePath: string, callRecordId: number): Promise<ApiResponse<{ recordingFile: { id: number }; asrTriggered: boolean }>> {
    const token = uni.getStorageSync(TOKEN_KEY) as string
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/recordings/upload`,
        filePath,
        name: 'file',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        formData: {
          callRecordId: String(callRecordId),
          sourceType: 'voice_memo',
        },
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              resolve(JSON.parse(res.data as string))
            } catch {
              resolve({ code: 0, message: 'ok', data: { recordingFile: { id: 0 }, asrTriggered: false } })
            }
          } else {
            reject(new Error(`上传失败 (${res.statusCode})`))
          }
        },
        fail: (err) => reject(new Error(err.errMsg || '上传失败')),
      })
    })
  },
}
