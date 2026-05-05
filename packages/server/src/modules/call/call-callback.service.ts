import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { CallStatus } from '@crm/shared'

/** Monotonically increasing order — a callback can only move forward */
const CALL_STATUS_ORDER: Record<string, number> = {
  [CallStatus.RINGING]: 1,
  [CallStatus.CONNECTED]: 2,
  [CallStatus.ON_HOLD]: 3,
  [CallStatus.ENDED]: 4,
}

/**
 * 处理语音供应商回调：更新 call_records 的 status、answered_at、duration、end_reason、provider_call_id。
 * 可根据 body.event 分发: call_answered / call_end 等。
 *
 * 幂等保护：
 *   - 使用 CALL_STATUS_ORDER 拒绝逆向/重复状态更新
 *   - WHERE 乐观锁条件 `status = currentStatus` 防止并发覆盖
 */
@Injectable()
export class CallCallbackService {
  private readonly logger = new Logger(CallCallbackService.name)

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
  ) {}

  async handleCallback(body: Record<string, unknown>): Promise<void> {
    const event = body.event as string | undefined
    const providerCallId = body.callId ?? body.call_id ?? body.provider_call_id
    if (!providerCallId) return

    const callIdStr = String(providerCallId)

    if (event === 'call_answered' || event === 'call_connected') {
      await this.safeTransition(callIdStr, CallStatus.CONNECTED, {
        answeredAt: new Date(),
      })
      return
    }

    if (event === 'call_end' || event === 'call_ended') {
      const duration = Number(body.duration ?? body.duration_seconds ?? 0)
      const endReason = (body.end_reason ?? body.reason) as string | undefined
      const updates: Partial<CallRecord> = { endReason: endReason ?? null }
      if (duration > 0) {
        updates.duration = duration
      }
      await this.safeTransition(callIdStr, CallStatus.ENDED, updates)
    }
  }

  /**
   * Idempotent state transition with optimistic locking:
   *
   * 1. Fetch current record and check status order — reject backward/duplicate transitions
   * 2. UPDATE ... WHERE providerCallId = ? AND status = currentStatus
   *    → affected === 0 means a concurrent update already moved the status forward
   */
  private async safeTransition(
    providerCallId: string,
    targetStatus: CallStatus,
    extraUpdates: Record<string, unknown>,
  ): Promise<void> {
    const record = await this.callRecordRepository.findOne({
      where: { providerCallId },
    })
    if (!record) {
      this.logger.warn(`Callback ignored: no record for providerCallId=${providerCallId}`)
      return
    }

    const currentOrder = CALL_STATUS_ORDER[record.status] ?? 0
    const targetOrder = CALL_STATUS_ORDER[targetStatus] ?? 0

    // Reject backward or duplicate status transitions
    if (targetOrder <= currentOrder) {
      this.logger.warn(
        `Callback ignored: status ${record.status}(${currentOrder}) → ${targetStatus}(${targetOrder}) is not a forward transition, providerCallId=${providerCallId}`,
      )
      return
    }

    // Optimistic locking: only update if status hasn't changed since we read it
    const result = await this.callRecordRepository.update(
      { providerCallId, status: record.status },
      { status: targetStatus, ...extraUpdates },
    )

    if (result.affected === 0) {
      this.logger.warn(
        `Callback concurrent conflict: providerCallId=${providerCallId} status already changed from ${record.status}`,
      )
    }
  }
}
