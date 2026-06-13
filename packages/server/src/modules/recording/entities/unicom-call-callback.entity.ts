import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export enum UnicomCallCallbackKind {
  CALL = 'call',
  RECORDING = 'recording',
}

export enum UnicomCallCallbackMatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  FAILED = 'failed',
}

@Index('IDX_unicom_call_callbacks_route_sid_type', ['routePhone', 'callSid', 'types'], {
  unique: true,
})
@Entity('unicom_call_callbacks')
export class UnicomCallCallback extends BaseEntity {
  @Index()
  @Column({ name: 'route_phone', type: 'varchar', length: 20 })
  routePhone!: string

  @Index()
  @Column({ name: 'call_sid', type: 'varchar', length: 100 })
  callSid!: string

  @Index()
  @Column({ name: 'related_call_sid', type: 'varchar', length: 100, nullable: true })
  relatedCallSid!: string | null

  @Column({ name: 'account_id', type: 'varchar', length: 100, nullable: true })
  accountId!: string | null

  @Column({ name: 'account_name', type: 'varchar', length: 100, nullable: true })
  accountName!: string | null

  @Column({ name: 'app_id', type: 'varchar', length: 100, nullable: true })
  appId!: string | null

  @Column({ name: 'app_name', type: 'varchar', length: 100, nullable: true })
  appName!: string | null

  @Index()
  @Column({ name: 'caller_no', type: 'varchar', length: 50 })
  callerNo!: string

  @Index()
  @Column({ name: 'called_no', type: 'varchar', length: 50 })
  calledNo!: string

  @Column({ name: 'display_number', type: 'varchar', length: 50, nullable: true })
  displayNumber!: string | null

  @Column({ name: 'call_type_text', type: 'varchar', length: 20 })
  callTypeText!: string

  @Index()
  @Column({ name: 'start_time', type: 'datetime', precision: 6 })
  startTime!: Date

  @Column({ name: 'end_time', type: 'datetime', precision: 6 })
  endTime!: Date

  @Column({ name: 'call_start_time', type: 'datetime', precision: 6, nullable: true })
  callStartTime!: Date | null

  @Column({ type: 'int' })
  duration!: number

  @Index()
  @Column({ type: 'int' })
  types!: number

  @Column({ name: 'is_success', type: 'tinyint', nullable: true })
  isSuccess!: number | null

  @Column({ name: 'is_dual', type: 'tinyint', nullable: true })
  isDual!: number | null

  @Column({ name: 'record_url', type: 'varchar', length: 1000, nullable: true })
  recordUrl!: string | null

  @Column({ name: 'caller_record_url', type: 'varchar', length: 1000, nullable: true })
  callerRecordUrl!: string | null

  @Column({ name: 'called_record_url', type: 'varchar', length: 1000, nullable: true })
  calledRecordUrl!: string | null

  @Column({ name: 'ring_cause', type: 'varchar', length: 50, nullable: true })
  ringCause!: string | null

  @Column({ name: 'ring_cause_desc', type: 'varchar', length: 255, nullable: true })
  ringCauseDesc!: string | null

  @Column({ name: 'ring_duration', type: 'int', nullable: true })
  ringDuration!: number | null

  @Column({ name: 'sip_cause', type: 'int', nullable: true })
  sipCause!: number | null

  @Column({ name: 'sip_cause_desc', type: 'varchar', length: 255, nullable: true })
  sipCauseDesc!: string | null

  @Column({ name: 'order_id', type: 'varchar', length: 100, nullable: true })
  orderId!: string | null

  @Column({ name: 'recv183', type: 'varchar', length: 50, nullable: true })
  recv183!: string | null

  @Column({ name: 'raw_payload', type: 'json' })
  rawPayload!: Record<string, unknown>

  @Index()
  @Column({ name: 'matched_call_record_id', type: 'int', nullable: true })
  matchedCallRecordId!: number | null

  @Column({
    name: 'callback_kind',
    type: 'varchar',
    length: 20,
    default: UnicomCallCallbackKind.CALL,
  })
  callbackKind!: UnicomCallCallbackKind

  @Index()
  @Column({
    name: 'match_status',
    type: 'varchar',
    length: 20,
    default: UnicomCallCallbackMatchStatus.PENDING,
  })
  matchStatus!: UnicomCallCallbackMatchStatus

  @Column({ name: 'match_reason', type: 'text', nullable: true })
  matchReason!: string | null
}
