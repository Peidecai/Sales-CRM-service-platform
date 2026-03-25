/**
 * Recording API — voice memo upload, playback, ASR transcript
 */
import { http, BASE_URL, TOKEN_KEY } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'

export interface RecordingVO {
  id: number
  callRecordId: number | null
  fileName: string | null
  ossKey: string
  fileSize: number | null
  durationSeconds: number | null
  mimeType: string | null
  sourceType: 'platform' | 'voice_memo' | 'manual_upload'
  createdAt: string
}

export interface TranscriptSegment {
  id: number
  segmentIndex: number | null
  startTimeMs: number | null
  endTimeMs: number | null
  speaker: 'agent' | 'customer' | 'unknown'
  text: string | null
}

export interface RecordingListParams {
  callRecordId?: number
  source?: string
  page?: number
  pageSize?: number
}

/**
 * Upload audio file via uni.uploadFile (multipart/form-data).
 * Returns a Promise wrapping the upload result.
 */
function uploadFile(filePath: string, callRecordId?: number): Promise<ApiResponse<RecordingVO>> {
  const token = uni.getStorageSync(TOKEN_KEY)
  const formData: Record<string, string> = {
    sourceType: 'voice_memo',
  }
  if (callRecordId) {
    formData.callRecordId = String(callRecordId)
  }

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}/recordings/upload`,
      filePath,
      name: 'file',
      formData,
      header: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      success(res) {
        try {
          const data = JSON.parse(res.data) as ApiResponse<RecordingVO>
          resolve(data)
        } catch {
          reject(new Error('Failed to parse upload response'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg ?? 'Upload failed'))
      },
    })
  })
}

export const recordingApi = {
  /** List recordings with pagination */
  getList(params: RecordingListParams): Promise<ApiResponse<PageResult<RecordingVO>>> {
    return http.get('/recordings', params as unknown as Record<string, unknown>)
  },

  /** Get single recording metadata */
  getOne(id: number): Promise<ApiResponse<RecordingVO>> {
    return http.get(`/recordings/${id}`)
  },

  /** Get temporary signed play URL */
  getPlayUrl(id: number, expires?: number): Promise<ApiResponse<{ url: string; expiresIn: number }>> {
    const params = expires ? { expires: String(expires) } : undefined
    return http.get(`/recordings/${id}/play-url`, params)
  },

  /** Get ASR transcript segments */
  getTranscript(id: number): Promise<ApiResponse<TranscriptSegment[]>> {
    return http.get(`/recordings/${id}/transcript`)
  },

  /** Trigger ASR processing */
  triggerAsr(id: number): Promise<ApiResponse<unknown>> {
    return http.post(`/recordings/${id}/trigger-asr`)
  },

  /** Upload a voice memo file */
  upload: uploadFile,
}
