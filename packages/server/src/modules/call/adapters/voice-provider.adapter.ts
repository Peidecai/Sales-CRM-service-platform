/**
 * 语音厂商适配器接口，便于切换阿里云/其他厂商。
 */
export interface VoiceProviderAdapter {
  dial(params: {
    agentId: string
    calleeNumber: string
    callerNumber?: string
  }): Promise<{ callId: string }>

  answer(callId: string): Promise<void>
  hangup(callId: string, reason?: string): Promise<void>
  mute(callId: string): Promise<void>
  unmute(callId: string): Promise<void>
  hold(callId: string): Promise<void>
  resume(callId: string): Promise<void>
  transfer(callId: string, targetNumber: string): Promise<void>
}
