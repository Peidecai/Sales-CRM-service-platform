import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { CallStatus } from '@crm/shared'

/**
 * 处理阿里云语音回调：更新 call_records 的 status、answered_at、duration、end_reason、provider_call_id。
 * 可根据 body.event 分发: call_answered / call_end 等。
 */
@Injectable()
export class CallCallbackService {
  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
  ) {}

  async handleCallback(body: Record<string, unknown>): Promise<void> {
    const event = body.event as string | undefined
    const providerCallId = body.callId ?? body.call_id ?? body.provider_call_id
    if (!providerCallId) return

    if (event === 'call_answered' || event === 'call_connected') {
      await this.callRecordRepository.update(
        { providerCallId: String(providerCallId) },
        { status: CallStatus.CONNECTED, answeredAt: new Date() },
      )
      return
    }

    if (event === 'call_end' || event === 'call_ended') {
      const duration = Number(body.duration ?? body.duration_seconds ?? 0)
      const endReason = (body.end_reason ?? body.reason) as string | undefined
      await this.callRecordRepository.update(
        { providerCallId: String(providerCallId) },
        duration > 0
          ? { status: CallStatus.ENDED, endReason: endReason ?? null, duration }
          : { status: CallStatus.ENDED, endReason: endReason ?? null },
      )
    }
  }
}
