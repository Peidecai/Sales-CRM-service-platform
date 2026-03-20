/**
 * Cloud call center API adapter
 *
 * Callback-mode calling: server initiates the call, records both sides,
 * then provides recording URL + AI analysis asynchronously.
 */

import { http } from './request'

// ─── Types ───────────────────────────────────────────────────────

export interface InitiateCallParams {
  customerId: string
  customerPhone: string
  callerPhone: string
}

export interface InitiateCallResult {
  callId: string
  status: string
}

export type CloudCallStatus =
  | 'initiating'
  | 'ringing_caller'
  | 'ringing_callee'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'no_answer'

export interface CloudCallStatusResult {
  callId: string
  status: CloudCallStatus
  duration?: number      // seconds
  startTime?: string
  endTime?: string
}

export interface CloudCallRecording {
  callId: string
  recordingUrl: string
  duration: number       // seconds
  aiAnalysis?: {
    summary: string
    intention: string
    score: number
    keywords: string[]
  }
}

export interface CloudCallSettings {
  enabled: boolean
  provider: string
  maxDuration: number    // seconds
  recordingEnabled: boolean
  aiAnalysisEnabled: boolean
}

// ─── API Functions ───────────────────────────────────────────────

/**
 * Initiate a cloud call (callback mode).
 * Server calls the sales rep first, then the customer.
 */
export function initiateCloudCall(data: InitiateCallParams) {
  return http.post<InitiateCallResult>('/cloud-call/initiate', data as unknown as Record<string, unknown>)
}

/**
 * Get real-time status of an active or completed cloud call.
 */
export function getCloudCallStatus(callId: string) {
  return http.get<CloudCallStatusResult>(`/cloud-call/${callId}/status`)
}

/**
 * Get recording URL and AI analysis for a completed call.
 */
export function getCallRecording(callId: string) {
  return http.get<CloudCallRecording>(`/cloud-call/${callId}/recording`)
}

/**
 * Get cloud call center settings for the current tenant.
 */
export function getCloudCallSettings() {
  return http.get<CloudCallSettings>('/cloud-call/settings')
}

// ─── Polling Utility ────────────────────────────────────────────

const TERMINAL_STATUSES: CloudCallStatus[] = ['completed', 'failed', 'no_answer']

export interface PollOptions {
  intervalMs?: number
  maxAttempts?: number
  onStatusChange?: (status: CloudCallStatusResult) => void
}

/**
 * Poll cloud call status until terminal state or timeout.
 * Returns final status result.
 */
export async function pollCallUntilComplete(
  callId: string,
  options: PollOptions = {},
): Promise<CloudCallStatusResult> {
  const { intervalMs = 3000, maxAttempts = 60, onStatusChange } = options
  let lastStatus = ''

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await getCloudCallStatus(callId)
    if (res.code !== 0) {
      throw new Error(res.message || '获取通话状态失败')
    }

    const statusResult = res.data as CloudCallStatusResult
    if (statusResult.status !== lastStatus) {
      lastStatus = statusResult.status
      onStatusChange?.(statusResult)
    }

    if (TERMINAL_STATUSES.includes(statusResult.status)) {
      return statusResult
    }

    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('通话状态轮询超时')
}

/**
 * Full cloud callback flow: initiate → poll → return final status.
 */
export async function executeCloudCallback(
  params: InitiateCallParams,
  pollOptions?: PollOptions,
): Promise<{ callId: string; finalStatus: CloudCallStatusResult }> {
  const initRes = await initiateCloudCall(params)
  if (initRes.code !== 0) {
    throw new Error(initRes.message || '发起回呼失败')
  }

  const { callId } = initRes.data as InitiateCallResult
  const finalStatus = await pollCallUntilComplete(callId, pollOptions)
  return { callId, finalStatus }
}
