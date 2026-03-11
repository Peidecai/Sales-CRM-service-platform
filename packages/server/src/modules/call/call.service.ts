import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import type { VoiceProviderAdapter } from './adapters/voice-provider.adapter'
import { CallDirection, CallType, CallStatus } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import type { CallRecordsQueryDto } from './dto/call-records-query.dto'

export interface CallRecordsListResult {
  list: CallRecord[]
  total: number
  page: number
  pageSize: number
}

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @Inject('VOICE_PROVIDER')
    private readonly voiceAdapter: VoiceProviderAdapter,
  ) {}

  async dial(
    dto: {
      calleeNumber: string
      callerNumber?: string
      customerId?: number
      opportunityId?: number
    },
    user: AuthUser,
  ): Promise<{ callId: string; recordId: number }> {
    const agentId = String(user.id)
    const result = await this.voiceAdapter.dial({
      agentId,
      calleeNumber: dto.calleeNumber,
      callerNumber: dto.callerNumber,
    })

    const record = this.callRecordRepository.create({
      customerId: dto.customerId ?? null,
      opportunityId: dto.opportunityId ?? null,
      userId: user.id,
      agentId: user.id,
      direction: CallDirection.OUTBOUND,
      callType: CallType.NORMAL,
      status: CallStatus.RINGING,
      callAt: new Date(),
      duration: 0,
      providerCallId: result.callId,
    })
    const saved = await this.callRecordRepository.save(record)
    return { callId: result.callId, recordId: saved.id }
  }

  private async getRecordByCallId(callId: string, user: AuthUser): Promise<CallRecord> {
    const id = parseInt(callId, 10)
    if (Number.isNaN(id)) {
      const byProvider = await this.callRecordRepository.findOne({
        where: { providerCallId: callId, deleted: false },
      })
      if (!byProvider) throw new NotFoundException('Call not found')
      this.checkCallOwnership(byProvider, user)
      return byProvider
    }
    const record = await this.callRecordRepository.findOne({
      where: { id, deleted: false },
    })
    if (!record) throw new NotFoundException('Call not found')
    this.checkCallOwnership(record, user)
    return record
  }

  private checkCallOwnership(record: CallRecord, user: AuthUser): void {
    if (user.role === UserRole.SALES && record.userId !== user.id && record.agentId !== user.id) {
      throw new ForbiddenException('No permission for this call')
    }
  }

  async answer(callId: string, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.answer(providerId)
    record.status = CallStatus.CONNECTED
    record.answeredAt = new Date()
    await this.callRecordRepository.save(record)
  }

  async hangup(callId: string, reason: string | undefined, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.hangup(providerId, reason)
    record.status = CallStatus.ENDED
    record.endReason = reason ?? null
    if (record.answeredAt) {
      record.duration = Math.floor((Date.now() - new Date(record.answeredAt).getTime()) / 1000)
    }
    await this.callRecordRepository.save(record)
  }

  async mute(callId: string, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.mute(providerId)
  }

  async unmute(callId: string, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.unmute(providerId)
  }

  async hold(callId: string, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.hold(providerId)
    record.status = CallStatus.ON_HOLD
    await this.callRecordRepository.save(record)
  }

  async resume(callId: string, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.resume(providerId)
    record.status = CallStatus.CONNECTED
    await this.callRecordRepository.save(record)
  }

  async transfer(callId: string, targetNumber: string, user: AuthUser): Promise<void> {
    const record = await this.getRecordByCallId(callId, user)
    const providerId = record.providerCallId || String(record.id)
    await this.voiceAdapter.transfer(providerId, targetNumber)
  }

  async getRecords(query: CallRecordsQueryDto, user: AuthUser): Promise<CallRecordsListResult> {
    const { page = 1, pageSize = 20, direction, callType, startDate, endDate } = query
    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.customer', 'customer')
      .leftJoinAndSelect('cr.opportunity', 'opportunity')
      .where('cr.deleted = :deleted', { deleted: false })

    if (user.role === UserRole.SALES) {
      qb.andWhere('(cr.userId = :uid OR cr.agentId = :uid)', { uid: user.id })
    }
    if (direction) qb.andWhere('cr.direction = :direction', { direction })
    if (callType) qb.andWhere('cr.callType = :callType', { callType })
    if (startDate) qb.andWhere('cr.callAt >= :startDate', { startDate: new Date(startDate) })
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      qb.andWhere('cr.callAt <= :endDate', { endDate: end })
    }

    qb.orderBy('cr.callAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async getRecordDetail(id: number, user: AuthUser): Promise<CallRecord> {
    const record = await this.callRecordRepository.findOne({
      where: { id, deleted: false },
      relations: ['customer', 'opportunity'],
    })
    if (!record) throw new NotFoundException('Call record not found')
    this.checkCallOwnership(record, user)
    return record
  }

  async getStatsOverview(user: AuthUser): Promise<{
    onlineAgents: number
    todayCallCount: number
    todayDuration: number
    queueCount: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .where('cr.deleted = :deleted', { deleted: false })
      .andWhere('cr.callAt >= :today', { today })
    if (user.role === UserRole.SALES) {
      qb.andWhere('(cr.userId = :uid OR cr.agentId = :uid)', { uid: user.id })
    }
    const count = await qb.getCount()
    const sum = await qb.select('SUM(cr.duration)', 'total').getRawOne<{ total: string }>()
    return {
      onlineAgents: 0,
      todayCallCount: count,
      todayDuration: sum?.total ? parseInt(sum.total, 10) : 0,
      queueCount: 0,
    }
  }
}
