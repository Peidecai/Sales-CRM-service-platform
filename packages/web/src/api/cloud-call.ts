import request from './request'

export interface CloudCallProvider {
  id: string
  name: string
  label: string
}

export interface CloudCallSettings {
  provider: string
  appKey: string
  instanceId: string
  webhookUrl: string
  phoneNumbers: string
  concurrentLines: number
  isActive: boolean
}

export interface LineStatus {
  balance: number
  currency: string
  phoneNumbers: string[]
  concurrentLines: number
}

export interface CallStats {
  today: number
  week: number
  month: number
  todayDuration: number
  weekDuration: number
  monthDuration: number
  dailyCosts: Array<{ date: string; cost: number }>
}

export interface TestConnectionResult {
  success: boolean
  message: string
}

export function getCloudCallSettings() {
  return request.get<CloudCallSettings>('/cloud-call/settings')
}

export interface UpdateCloudCallSettingsParams {
  provider?: string
  appKey?: string
  appSecret?: string
  webhookUrl?: string
}

export function updateCloudCallSettings(data: UpdateCloudCallSettingsParams) {
  return request.put<CloudCallSettings>('/cloud-call/settings', data)
}

export function testCloudCallConnection() {
  return request.post<TestConnectionResult>('/cloud-call/settings/test')
}

export function getLineStatus() {
  return request.get<LineStatus>('/cloud-call/line-status')
}

export function getCallStats() {
  return request.get<CallStats>('/cloud-call/stats')
}

// ─── Cloud Call Dialing ─────────────────────────────────────────

export interface InitiateCloudCallParams {
  customerId: number
  callerPhone: string
  calleePhone: string
}

export interface CloudCallRecord {
  id: number
  externalCallId: string
  status: string
  duration: number | null
  recordingUrl: string | null
  aiAnalysisId: number | null
  createdAt: string
}

export interface CloudCallStatusResponse {
  record: CloudCallRecord
  liveStatus: string
}

export function initiateCloudCall(data: InitiateCloudCallParams) {
  return request.post<CloudCallRecord>('/cloud-call/initiate', data)
}

export function getCloudCallStatus(id: number) {
  return request.get<CloudCallStatusResponse>(`/cloud-call/${id}/status`)
}

export function getCloudCallRecording(id: number) {
  return request.get<{ url: string }>(`/cloud-call/${id}/recording`)
}

const TERMINAL_STATUSES = ['completed', 'failed']

export interface PollOptions {
  intervalMs?: number
  maxAttempts?: number
  signal?: AbortSignal
  onStatusChange?: (res: CloudCallStatusResponse) => void
}

export async function pollCloudCallStatus(
  id: number,
  options: PollOptions = {},
): Promise<CloudCallStatusResponse> {
  const { intervalMs = 3000, maxAttempts = 60, signal, onStatusChange } = options
  let lastStatus = ''

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new DOMException('Polling aborted', 'AbortError')
    const data = (await getCloudCallStatus(id)) as unknown as CloudCallStatusResponse
    if (signal?.aborted) throw new DOMException('Polling aborted', 'AbortError')
    if (data.liveStatus !== lastStatus) {
      lastStatus = data.liveStatus
      onStatusChange?.(data)
    }
    if (TERMINAL_STATUSES.includes(data.liveStatus)) {
      return data
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new DOMException('Polling aborted', 'AbortError'))
        },
        { once: true },
      )
    })
  }

  throw new Error('通话状态轮询超时')
}
