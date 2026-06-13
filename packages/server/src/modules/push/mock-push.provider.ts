import { Injectable, Logger } from '@nestjs/common'
import { PushProvider, PushPayload, PushResult } from './interfaces/push-provider.interface'

@Injectable()
export class MockPushProvider implements PushProvider {
  private readonly logger = new Logger(MockPushProvider.name)

  async send(deviceToken: string, payload: PushPayload): Promise<PushResult> {
    this.logger.debug(`[MOCK] Push to ${deviceToken}: ${payload.title} - ${payload.body}`)
    return { success: true, messageId: `mock-${Date.now()}` }
  }

  async sendBatch(deviceTokens: string[], payload: PushPayload): Promise<PushResult[]> {
    this.logger.debug(`[MOCK] Batch push to ${deviceTokens.length} devices: ${payload.title}`)
    return deviceTokens.map(() => ({
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }))
  }
}
