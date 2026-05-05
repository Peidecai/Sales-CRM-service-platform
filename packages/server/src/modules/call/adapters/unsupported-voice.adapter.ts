import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import type { VoiceProviderAdapter } from './voice-provider.adapter'

@Injectable()
export class UnsupportedVoiceAdapter implements VoiceProviderAdapter {
  async dial(): Promise<{ callId: string }> {
    throw this.unavailable()
  }

  async answer(): Promise<void> {
    throw this.unavailable()
  }

  async hangup(): Promise<void> {
    throw this.unavailable()
  }

  async mute(): Promise<void> {
    throw this.unavailable()
  }

  async unmute(): Promise<void> {
    throw this.unavailable()
  }

  async hold(): Promise<void> {
    throw this.unavailable()
  }

  async resume(): Promise<void> {
    throw this.unavailable()
  }

  async transfer(): Promise<void> {
    throw this.unavailable()
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException('Voice call provider is not configured')
  }
}
