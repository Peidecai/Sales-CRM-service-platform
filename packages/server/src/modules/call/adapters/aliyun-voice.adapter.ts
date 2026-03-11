import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { VoiceProviderAdapter } from './voice-provider.adapter'

/**
 * 阿里云语音通话适配器（占位实现）。
 * 实际需接入阿里云 dyvmsapi 或云呼叫中心 API，从 ConfigService 读取 AppKey/AppSecret/接入码等。
 */
@Injectable()
export class AliyunVoiceAdapter implements VoiceProviderAdapter {
  constructor(private readonly configService: ConfigService) {}

  async dial(params: {
    agentId: string
    calleeNumber: string
    callerNumber?: string
  }): Promise<{ callId: string }> {
    void this.configService.get<string>('ALIYUN_VOICE_APP_KEY')
    void this.configService.get<string>('ALIYUN_VOICE_APP_SECRET')
    // TODO: 调用阿里云外呼 API，返回厂商 callId
    const callId = `aliyun-${Date.now()}-${params.agentId}`
    return { callId }
  }

  async answer(callId: string): Promise<void> {
    // TODO: 阿里云接听 API
    void callId
  }

  async hangup(callId: string, reason?: string): Promise<void> {
    // TODO: 阿里云挂断 API
    void callId
    void reason
  }

  async mute(callId: string): Promise<void> {
    void callId
  }

  async unmute(callId: string): Promise<void> {
    void callId
  }

  async hold(callId: string): Promise<void> {
    void callId
  }

  async resume(callId: string): Promise<void> {
    void callId
  }

  async transfer(callId: string, targetNumber: string): Promise<void> {
    void callId
    void targetNumber
  }
}
