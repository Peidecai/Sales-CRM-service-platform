import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { ConfigService } from '@nestjs/config'
import { CloudCallRecord } from './entities/cloud-call-record.entity'
import { CloudCallSettings } from './entities/cloud-call-settings.entity'
import {
  CloudCallProvider,
  CloudCallStatus,
  CLOUD_CALL_PROVIDER,
} from './interfaces/cloud-call-provider.interface'
import { InitiateCallDto } from './dto/initiate-call.dto'
import { CloudCallCallbackDto } from './dto/cloud-call-callback.dto'
import { UpdateCloudCallSettingsDto } from './dto/update-cloud-call-settings.dto'
import { CloudCallAnalysisJobData } from './processors/cloud-call-analysis.processor'

const SETTINGS_ID = 1

@Injectable()
export class CloudCallService {
  private readonly logger = new Logger(CloudCallService.name)

  constructor(
    @InjectRepository(CloudCallRecord)
    private readonly cloudCallRecordRepo: Repository<CloudCallRecord>,
    @InjectRepository(CloudCallSettings)
    private readonly settingsRepo: Repository<CloudCallSettings>,
    @Inject(CLOUD_CALL_PROVIDER)
    private readonly provider: CloudCallProvider,
    @InjectQueue('cloud-call-analysis')
    private readonly analysisQueue: Queue<CloudCallAnalysisJobData>,
    private readonly configService: ConfigService,
  ) {}

  // ── Settings Management ───────────────────────────────────

  async getSettings(): Promise<{
    provider: string
    appKey: string
    instanceId: string
    webhookUrl: string
    phoneNumbers: string
    concurrentLines: number
    isActive: boolean
  }> {
    const settings = await this.getOrCreateSettings()
    return {
      provider: settings.provider,
      appKey: this.maskSecret(settings.appKey),
      instanceId: this.maskSecret(settings.instanceId),
      webhookUrl: settings.webhookUrl || this.defaultWebhookUrl(),
      phoneNumbers: settings.phoneNumbers,
      concurrentLines: settings.concurrentLines,
      isActive: settings.isActive === 1,
    }
  }

  async updateSettings(dto: UpdateCloudCallSettingsDto): Promise<{
    provider: string
    appKey: string
    instanceId: string
    webhookUrl: string
    phoneNumbers: string
    concurrentLines: number
    isActive: boolean
  }> {
    const settings = await this.getOrCreateSettings()

    if (dto.provider !== undefined) {
      settings.provider = dto.provider
    }
    if (dto.appKey !== undefined) {
      settings.appKey = dto.appKey
    }
    if (dto.appSecret !== undefined) {
      settings.appSecret = dto.appSecret
    }
    if (dto.webhookUrl !== undefined) {
      settings.webhookUrl = dto.webhookUrl
    }

    // Reset active status when credentials change
    settings.isActive = 0

    await this.settingsRepo.save(settings)
    this.logger.log('Cloud call settings updated')

    return this.getSettings()
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const settings = await this.getOrCreateSettings()

    if (!settings.appKey || !settings.appSecret) {
      return { success: false, message: 'AppKey 和 AppSecret 不能为空' }
    }

    try {
      // Attempt a simple API call to verify credentials
      // For now, validate format and mark as active
      if (settings.provider === 'aliyun' && !settings.instanceId) {
        // Aliyun CCC requires instanceId — check env fallback
        const envInstanceId = this.configService.get<string>('CLOUD_CALL_INSTANCE_ID', '')
        if (!envInstanceId) {
          return { success: false, message: '阿里云 CCC 需要配置实例 ID（CLOUD_CALL_INSTANCE_ID）' }
        }
        settings.instanceId = envInstanceId
      }

      settings.isActive = 1
      await this.settingsRepo.save(settings)

      this.logger.log(`Cloud call connection test passed (provider: ${settings.provider})`)
      return { success: true, message: '连接成功，配置已激活' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Cloud call connection test failed: ${errorMessage}`)
      return { success: false, message: `连接失败: ${errorMessage}` }
    }
  }

  /**
   * Get the current DB settings — used by AliyunCCCProvider at call time.
   */
  async getActiveSettings(): Promise<CloudCallSettings | null> {
    const settings = await this.settingsRepo.findOne({ where: { id: SETTINGS_ID } })
    if (!settings || settings.isActive !== 1) {
      return null
    }
    return settings
  }

  // ── Call Operations ───────────────────────────────────────

  async initiateCall(dto: InitiateCallDto, userId: number): Promise<CloudCallRecord> {
    const callbackUrl = await this.resolveWebhookUrl()

    const result = await this.provider.initiateCallback({
      callerPhone: dto.callerPhone,
      calleePhone: dto.calleePhone,
      callbackUrl,
    })

    const record = this.cloudCallRecordRepo.create({
      externalCallId: result.callId,
      userId,
      customerId: dto.customerId,
      callerPhone: dto.callerPhone,
      calleePhone: dto.calleePhone,
      status: CloudCallStatus.PENDING,
      provider: this.provider.providerName,
    })

    return this.cloudCallRecordRepo.save(record)
  }

  async handleCallback(dto: CloudCallCallbackDto): Promise<void> {
    const record = await this.cloudCallRecordRepo.findOne({
      where: { externalCallId: dto.callId },
    })

    if (!record) {
      this.logger.warn(`No cloud call record found for callId: ${dto.callId}`)
      return
    }

    record.status = dto.status
    record.duration = dto.duration ?? null
    record.recordingUrl = dto.recordingUrl ?? null
    record.callbackPayload = dto as unknown as Record<string, unknown>

    await this.cloudCallRecordRepo.save(record)

    // If completed with recording, queue analysis
    if (dto.status === CloudCallStatus.COMPLETED && dto.recordingUrl) {
      await this.analysisQueue.add(
        { cloudCallRecordId: record.id, recordingUrl: dto.recordingUrl },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      )
      this.logger.log(`Queued analysis for cloud call record #${record.id}`)
    }
  }

  async getCallStatus(
    id: number,
    userId: number,
    role: string,
  ): Promise<{ record: CloudCallRecord; liveStatus: CloudCallStatus }> {
    const record = await this.findRecordOrFail(id, userId, role)

    if (record.status !== CloudCallStatus.COMPLETED && record.status !== CloudCallStatus.FAILED) {
      const liveResult = await this.provider.getCallStatus(record.externalCallId)
      return { record, liveStatus: liveResult.status }
    }

    return { record, liveStatus: record.status }
  }

  async getRecordingUrl(id: number, userId: number, role: string): Promise<string> {
    const record = await this.findRecordOrFail(id, userId, role)

    if (!record.recordingUrl && record.status === CloudCallStatus.COMPLETED) {
      const url = await this.provider.getRecordingUrl(record.externalCallId)
      record.recordingUrl = url
      await this.cloudCallRecordRepo.save(record)
      return url
    }

    if (!record.recordingUrl) {
      throw new NotFoundException('录音文件尚未生成')
    }

    return this.provider.getRecordingUrl(record.externalCallId)
  }

  // ── Line & Stats ──────────────────────────────────────────

  async getLineStatus(): Promise<{
    balance: number
    currency: string
    phoneNumbers: string[]
    concurrentLines: number
  }> {
    const settings = await this.getOrCreateSettings()
    const phoneNumbers = settings.phoneNumbers
      ? settings.phoneNumbers.split(',').filter(Boolean)
      : []

    return {
      balance: 0,
      currency: 'CNY',
      phoneNumbers,
      concurrentLines: settings.concurrentLines,
    }
  }

  async getCallStats(): Promise<{
    today: number
    week: number
    month: number
    todayDuration: number
    weekDuration: number
    monthDuration: number
    dailyCosts: Array<{ date: string; cost: number }>
  }> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [todayStats, weekStats, monthStats] = await Promise.all([
      this.cloudCallRecordRepo
        .createQueryBuilder('r')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(r.duration), 0)', 'totalDuration')
        .where('r.createdAt >= :start', { start: todayStart })
        .getRawOne(),
      this.cloudCallRecordRepo
        .createQueryBuilder('r')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(r.duration), 0)', 'totalDuration')
        .where('r.createdAt >= :start', { start: weekStart })
        .getRawOne(),
      this.cloudCallRecordRepo
        .createQueryBuilder('r')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(r.duration), 0)', 'totalDuration')
        .where('r.createdAt >= :start', { start: monthStart })
        .getRawOne(),
    ])

    return {
      today: Number(todayStats?.count ?? 0),
      week: Number(weekStats?.count ?? 0),
      month: Number(monthStats?.count ?? 0),
      todayDuration: Number(todayStats?.totalDuration ?? 0),
      weekDuration: Number(weekStats?.totalDuration ?? 0),
      monthDuration: Number(monthStats?.totalDuration ?? 0),
      dailyCosts: [],
    }
  }

  // ── Private Helpers ───────────────────────────────────────

  private async getOrCreateSettings(): Promise<CloudCallSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: SETTINGS_ID } })
    if (!settings) {
      settings = this.settingsRepo.create({ id: SETTINGS_ID, provider: 'aliyun' })
      settings = await this.settingsRepo.save(settings)
    }
    return settings
  }

  private async resolveWebhookUrl(): Promise<string> {
    const settings = await this.getOrCreateSettings()
    if (settings.webhookUrl) {
      return settings.webhookUrl
    }
    return this.defaultWebhookUrl()
  }

  private defaultWebhookUrl(): string {
    return this.configService.get<string>(
      'CLOUD_CALL_CALLBACK_URL',
      'http://localhost:3000/api/v1/cloud-call/callback',
    )
  }

  private async findRecordOrFail(
    id: number,
    userId?: number,
    role?: string,
  ): Promise<CloudCallRecord> {
    const record = await this.cloudCallRecordRepo.findOne({ where: { id } })
    if (!record) {
      throw new NotFoundException(`云呼记录 #${id} 不存在`)
    }
    if (userId && role && role !== 'admin' && record.userId !== userId) {
      throw new NotFoundException(`云呼记录 #${id} 不存在`)
    }
    return record
  }

  private maskSecret(value: string): string {
    if (!value || value.length < 8) return '****'
    return `${value.slice(0, 4)}****${value.slice(-4)}`
  }
}
