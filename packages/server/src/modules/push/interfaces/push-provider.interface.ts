export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface PushResult {
  success: boolean
  messageId?: string
  error?: string
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER')

export interface PushProvider {
  send(deviceToken: string, payload: PushPayload): Promise<PushResult>
  sendBatch(deviceTokens: string[], payload: PushPayload): Promise<PushResult[]>
}
