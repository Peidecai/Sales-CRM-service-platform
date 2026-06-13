import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import type { CloudTranscriptionSegmentDto } from '../dto/cloud-transcription-callback.dto'

export enum CloudTranscriptionMatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  AMBIGUOUS = 'ambiguous',
  FAILED = 'failed',
}

@Entity('cloud_transcription_callbacks')
export class CloudTranscriptionCallback extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'task_id', type: 'varchar', length: 100 })
  taskId!: string

  @Index()
  @Column({ name: 'call_sid', type: 'varchar', length: 100 })
  callSid!: string

  @Column({ name: 'status_code', type: 'int' })
  statusCode!: number

  @Column({ name: 'status_text', type: 'varchar', length: 100 })
  statusText!: string

  @Column({ name: 'biz_duration_ms', type: 'int' })
  bizDurationMs!: number

  @Index()
  @Column({ name: 'request_time', type: 'datetime', precision: 6 })
  requestTime!: Date

  @Index()
  @Column({ name: 'solve_time', type: 'datetime', precision: 6 })
  solveTime!: Date

  @Column({ name: 'raw_payload', type: 'json' })
  rawPayload!: Record<string, unknown>

  @Column({ name: 'transcript_text', type: 'longtext', nullable: true })
  transcriptText!: string | null

  @Column({ type: 'json' })
  segments!: CloudTranscriptionSegmentDto[]

  @Index()
  @Column({ name: 'matched_call_record_id', type: 'int', nullable: true })
  matchedCallRecordId!: number | null

  @Index()
  @Column({
    name: 'match_status',
    type: 'varchar',
    length: 20,
    default: CloudTranscriptionMatchStatus.PENDING,
  })
  matchStatus!: CloudTranscriptionMatchStatus

  @Column({ name: 'match_reason', type: 'text', nullable: true })
  matchReason!: string | null
}
