import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { ConfigService } from '@nestjs/config'
import { CloudCallRecord } from './entities/cloud-call-record.entity'
import {
  CloudCallProvider,
  CloudCallStatus,
  CLOUD_CALL_PROVIDER,
} from './interfaces/cloud-call-provider.interface'
import { InitiateCallDto } from './dto/initiate-call.dto'
import { CloudCallCallbackDto } from './dto/cloud-call-callback.dto'
import { CloudCallAnalysisJobData } from './processors/cloud-call-analysis.processor'

export interface CloudCallSettings {
  provider: string
  appKey: string
  webhookUrl: string
}

@Injectable()
export class CloudCallService {
  private readonly logger = new Logger(CloudCallService.name)

  constructor(
    @InjectRepository(CloudCallRecord)
    private readonly cloudCallRecordRepo: Repository<CloudCallRecord>,
    @Inject(CLOUD_CALL_PROVIDER)
    private readonly provider: CloudCallProvider,
    @InjectQueue('cloud-call-analysis')
    private readonly analysisQueue: Queue<CloudCallAnalysisJobData>,
    private readonly configService: ConfigService,
  ) {}

  async initiateCall(dto: InitiateCallDto, userId: number): Promise<CloudCallRecord> {
    const callbackUrl = this.configService.get<string>(
      'CLOUD_CALL_CALLBACK_URL',
      'http://localhost:3000/api/v1/cloud-call/callback',
    )

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

    // Also check live status from provider if not completed
    if (record.status !== CloudCallStatus.COMPLETED && record.status !== CloudCallStatus.FAILED) {
      const liveResult = await this.provider.getCallStatus(record.externalCallId)
      return { record, liveStatus: liveResult.status }
    }

    return { record, liveStatus: record.status }
  }

  async getRecordingUrl(id: number, userId: number, role: string): Promise<string> {
    const record = await this.findRecordOrFail(id, userId, role)

    if (!record.recordingUrl && record.status === CloudCallStatus.COMPLETED) {
      // Try to fetch from provider
      const url = await this.provider.getRecordingUrl(record.externalCallId)
      record.recordingUrl = url
      await this.cloudCallRecordRepo.save(record)
      return url
    }

    if (!record.recordingUrl) {
      throw new NotFoundException('录音文件尚未生成')
    }

    // Return a signed URL from the provider
    return this.provider.getRecordingUrl(record.externalCallId)
  }

  async getSettings(): Promise<CloudCallSettings> {
    return {
      provider: this.configService.get<string>('CLOUD_CALL_PROVIDER', 'aliyun'),
      appKey: this.maskSecret(this.configService.get<string>('CLOUD_CALL_APP_KEY', '')),
      webhookUrl: this.configService.get<string>(
        'CLOUD_CALL_CALLBACK_URL',
        'http://localhost:3000/api/v1/cloud-call/callback',
      ),
    }
  }

  async updateSettings(_settings: Partial<CloudCallSettings>): Promise<CloudCallSettings> {
    // In production, persist settings to DB or config store
    // For now, return current settings (env-based config is read-only)
    this.logger.log('Cloud call settings update requested (env-based config is read-only)')
    return this.getSettings()
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
    // Data ownership: non-admin users can only access their own records
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
