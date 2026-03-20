import request from './request'

/** 上传单个录音（手动上传） */
export const uploadRecording = (file: File, data: Record<string, unknown> = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) formData.append(k, String(v))
  })
  return request.post('/recordings/manual-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

/** 批量上传录音 */
export const batchUploadRecording = (files: File[], items: Record<string, unknown>[] = []) => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  if (items.length > 0) formData.append('items', JSON.stringify(items))
  return request.post('/recordings/batch-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  })
}

/** 重新 AI 分析 */
export const reanalyzeRecording = (id: number) => {
  return request.post(`/recordings/${id}/reanalyze`)
}

/** 录音列表 */
export const getRecordings = (params: {
  callRecordId?: number
  source?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/recordings', { params })
}

/** 录音详情 */
export const getRecording = (id: number) => {
  return request.get(`/recordings/${id}`)
}

/** 获取播放URL */
export const getPlayUrl = (id: number) => {
  return request.get(`/recordings/${id}/play-url`)
}

/** 转写结果 */
export const getTranscript = (id: number) => {
  return request.get(`/recordings/${id}/transcript`)
}
