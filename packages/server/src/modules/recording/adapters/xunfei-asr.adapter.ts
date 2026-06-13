import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AsrProviderAdapter } from './asr-provider.adapter'

/**
 * 讯飞 ASR 适配器（占位实现）。
 * 配置从 ConfigService 读取（讯飞 appId、apiKey、apiSecret 等）。
 */
@Injectable()
export class XunfeiAsrAdapter implements AsrProviderAdapter {
  constructor(private readonly configService: ConfigService) {}

  async submitTask(_recordingUrlOrOssKey: string): Promise<{ externalTaskId: string }> {
    void this.configService.get<string>('XUNFEI_ASR_APP_ID')
    // TODO: 调用讯飞语音转写 API 创建任务
    const externalTaskId = `xunfei-${Date.now()}`
    return { externalTaskId }
  }

  async pollOrWebhookResult(_taskId: string): Promise<
    Array<{
      segmentIndex: number
      startTimeMs: number
      endTimeMs: number
      speaker: 'agent' | 'customer' | 'unknown'
      text: string
    }>
  > {
    // TODO: 轮询或 webhook 获取结果
    return []
  }
}
