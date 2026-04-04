import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CloudCallProvider,
  CloudCallStatus,
  CloudCallStatusResult,
  InitiateCallbackParams,
  InitiateCallbackResult,
} from '../interfaces/cloud-call-provider.interface'
import { CloudCallService } from '../cloud-call.service'
import { v4 as uuidv4 } from 'uuid'

/**
 * Alibaba Cloud CCC (Cloud Contact Center) Provider
 *
 * Credentials are read from the database (cloud_call_settings table)
 * at call time, with env vars as fallback.
 *
 * When no valid credentials exist, falls back to mock mode with
 * in-memory call simulation for local development.
 */
@Injectable()
export class AliyunCCCProvider implements CloudCallProvider {
  private readonly logger = new Logger(AliyunCCCProvider.name)
  readonly providerName = 'aliyun'

  // In-memory mock state (dev only)
  private readonly mockCalls = new Map<
    string,
    { status: CloudCallStatus; duration: number | null }
  >()

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CloudCallService))
    private readonly cloudCallService: CloudCallService,
  ) {}

  async initiateCallback(params: InitiateCallbackParams): Promise<InitiateCallbackResult> {
    const credentials = await this.resolveCredentials()

    if (credentials) {
      // TODO: Replace with real Aliyun CCC SDK call
      // const client = new CCC20200701Client(...)
      // const result = await client.makeCall({
      //   instanceId: credentials.instanceId,
      //   caller: params.callerPhone,
      //   callee: params.calleePhone,
      //   callbackUrl: params.callbackUrl,
      // })
      // return { callId: result.body.data.callId }
      this.logger.log(
        `[REAL] Would initiate callback: ${params.callerPhone} -> ${params.calleePhone} ` +
          `(instance: ${credentials.instanceId})`,
      )
    }

    // Mock mode fallback
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
    const expiry = Date.now() + 15 * 60 * 1000
    return `https://mock-oss.aliyuncs.com/recordings/${callId}.wav?expires=${expiry}&signature=mock`
  }

  /**
   * Resolve credentials: DB settings first, env vars as fallback.
   */
  private async resolveCredentials(): Promise<{
    instanceId: string
    accessKeyId: string
    accessKeySecret: string
  } | null> {
    try {
      const settings = await this.cloudCallService.getActiveSettings()
      if (settings && settings.appKey && settings.appSecret) {
        return {
          instanceId: settings.instanceId,
          accessKeyId: settings.appKey,
          accessKeySecret: settings.appSecret,
        }
      }
    } catch {
      this.logger.warn('Failed to read DB settings, falling back to env vars')
    }

    // Env var fallback
    const instanceId = this.configService.get<string>('CLOUD_CALL_INSTANCE_ID', '')
    const accessKeyId = this.configService.get<string>('CLOUD_CALL_ACCESS_KEY_ID', '')
    const accessKeySecret = this.configService.get<string>('CLOUD_CALL_ACCESS_KEY_SECRET', '')

    if (instanceId && accessKeyId && accessKeySecret) {
      return { instanceId, accessKeyId, accessKeySecret }
    }

    this.logger.warn('No cloud call credentials configured — running in MOCK mode')
    return null
  }
}
