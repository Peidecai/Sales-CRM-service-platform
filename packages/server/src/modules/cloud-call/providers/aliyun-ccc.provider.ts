import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CloudCallProvider,
  CloudCallStatus,
  CloudCallStatusResult,
  InitiateCallbackParams,
  InitiateCallbackResult,
} from '../interfaces/cloud-call-provider.interface'
import { v4 as uuidv4 } from 'uuid'

/**
 * 阿里云 CCC (Cloud Contact Center) Provider — Mock 实现
 * 后续接入真实 SDK 时替换 mock 逻辑
 */
@Injectable()
export class AliyunCCCProvider implements CloudCallProvider {
  private readonly logger = new Logger(AliyunCCCProvider.name)
  readonly providerName = 'aliyun'

  // In-memory mock state
  private readonly mockCalls = new Map<
    string,
    { status: CloudCallStatus; duration: number | null }
  >()

  constructor(private readonly configService: ConfigService) {}

  async initiateCallback(params: InitiateCallbackParams): Promise<InitiateCallbackResult> {
    const appKey = this.configService.get<string>('CLOUD_CALL_APP_KEY', '')
    if (!appKey) {
      this.logger.warn('CLOUD_CALL_APP_KEY not configured — using mock mode')
    }

    this.logger.log(`[MOCK] Initiating callback: ${params.callerPhone} -> ${params.calleePhone}`)

    const callId = `aliyun-${uuidv4()}`
    this.mockCalls.set(callId, { status: CloudCallStatus.RINGING, duration: null })

    // Simulate async status progression
    setTimeout(() => {
      const call = this.mockCalls.get(callId)
      if (call) {
        call.status = CloudCallStatus.CONNECTED
      }
    }, 2000)

    setTimeout(() => {
      const call = this.mockCalls.get(callId)
      if (call) {
        call.status = CloudCallStatus.COMPLETED
        call.duration = Math.floor(Math.random() * 300) + 30
      }
    }, 5000)

    return { callId }
  }

  async getCallStatus(callId: string): Promise<CloudCallStatusResult> {
    const call = this.mockCalls.get(callId)
    if (!call) {
      return { callId, status: CloudCallStatus.FAILED, duration: null }
    }

    return { callId, status: call.status, duration: call.duration }
  }

  async getRecordingUrl(callId: string): Promise<string> {
    this.logger.log(`[MOCK] Generating recording URL for callId: ${callId}`)
    // Mock: return a signed URL with 15-minute expiry
    const expiry = Date.now() + 15 * 60 * 1000
    return `https://mock-oss.aliyuncs.com/recordings/${callId}.wav?expires=${expiry}&signature=mock`
  }
}
