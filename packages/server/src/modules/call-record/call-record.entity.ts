import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { CallDirection, CallType, CallStatus, CallResult } from '@crm/shared'
import { Customer } from '../customer/customer.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { User } from '../user/user.entity'

export interface CallRecordTranscriptSegment {
  id: number
  segmentIndex: number | null
  startTimeMs: number | null
  endTimeMs: number | null
  speaker: string
  text: string
}

@Index('IDX_call_records_provider_sim_unique', ['providerCallId', 'simNumber', 'simCarrier'], {
  unique: true,
})
@Entity('call_records')
export class CallRecord extends BaseEntity {
  @Index()
  @Column({ type: 'int', name: 'customer_id', nullable: true, comment: '关联客户ID' })
  customerId!: number | null

  @Index()
  @Column({ type: 'int', name: 'opportunity_id', nullable: true })
  opportunityId!: number | null

  @Column({
    type: 'enum',
    enum: CallDirection,
    default: CallDirection.OUTBOUND,
    comment: '呼叫方向',
  })
  direction!: CallDirection

  @Column({
    name: 'call_type',
    type: 'enum',
    enum: CallType,
    default: CallType.NORMAL,
    nullable: true,
    comment: '呼叫类型',
  })
  callType!: CallType

  @Index()
  @Column({ type: 'int', name: 'agent_id', nullable: true, comment: '坐席ID' })
  agentId!: number | null

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.ENDED,
    comment: '通话状态',
  })
  status!: CallStatus

  @Column({
    name: 'answered_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: '接听时间',
  })
  answeredAt!: Date | null

  @Column({ type: 'varchar', name: 'end_reason', length: 50, nullable: true, comment: '挂断原因' })
  endReason!: string | null

  @Index()
  @Column({
    type: 'varchar',
    name: 'provider_call_id',
    length: 100,
    nullable: true,
    comment: '厂商通话ID',
  })
  providerCallId!: string | null

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    name: 'client_call_id',
    length: 100,
    nullable: true,
    comment: '客户端生成的通话幂等ID',
  })
  clientCallId!: string | null

  // ---- Relations ----

  @ManyToOne(() => Customer, (c) => c.callRecords, {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null

  @ManyToOne(() => Opportunity, (o) => o.callRecords, {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity!: Opportunity | null

  @ManyToOne(() => User, { createForeignKeyConstraints: false, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null

  @Index()
  @Column({ name: 'user_id', comment: 'Caller user ID' })
  userId!: number

  @Column({ name: 'call_at', type: 'datetime' })
  callAt!: Date

  @Column({ type: 'int', default: 0, comment: 'Duration in seconds' })
  duration!: number

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary!: string | null

  @Column({ type: 'varchar', name: 'recording_url', length: 500, nullable: true })
  recordingUrl!: string | null

  @Column({
    name: 'estimated_duration',
    type: 'int',
    nullable: true,
    comment: '估算通话时长（秒），方案B手机原生外呼专用',
  })
  estimatedDuration!: number | null

  @Column({
    name: 'call_result',
    type: 'enum',
    enum: CallResult,
    nullable: true,
    comment: '通话结果',
  })
  callResult!: CallResult | null

  @Column({
    type: 'boolean',
    name: 'is_manual_upload',
    default: false,
    comment: '是否手动上传录音',
  })
  isManualUpload!: boolean

  @Column({ name: 'sim_slot', type: 'int', nullable: true, comment: '使用的 SIM 卡槽位' })
  simSlot!: number | null

  @Column({
    name: 'sim_number',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '使用的 SIM 卡号码',
  })
  simNumber!: string | null

  @Column({ name: 'sim_carrier', type: 'varchar', length: 20, nullable: true, comment: '运营商' })
  simCarrier!: string | null

  transcriptSegments?: CallRecordTranscriptSegment[]

  transcriptText?: string

  transcriptSegmentCount?: number

  transcriptTextLen?: number

  customerPhone?: string | null

  salesUserName?: string | null

  salesUserPhone?: string | null

  counterpartPhone?: string | null

  callPhoneNumber?: string | null
}
