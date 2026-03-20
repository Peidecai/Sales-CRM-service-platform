export enum CloudCallStatus {
  PENDING = 'pending',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface InitiateCallbackParams {
  callerPhone: string
  calleePhone: string
  callbackUrl: string
}

export interface InitiateCallbackResult {
  callId: string
}

export interface CloudCallStatusResult {
  callId: string
  status: CloudCallStatus
  duration: number | null
}

export interface CloudCallProvider {
  readonly providerName: string

  initiateCallback(params: InitiateCallbackParams): Promise<InitiateCallbackResult>

  getCallStatus(callId: string): Promise<CloudCallStatusResult>

  getRecordingUrl(callId: string): Promise<string>
}

export const CLOUD_CALL_PROVIDER = 'CLOUD_CALL_PROVIDER'
