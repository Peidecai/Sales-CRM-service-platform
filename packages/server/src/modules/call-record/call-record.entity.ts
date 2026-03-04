import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity('call_records')
export class CallRecord extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  @Column({ name: 'opportunity_id', nullable: true })
  opportunityId!: number

  @Index()
  @Column({ name: 'user_id', comment: 'Caller user ID' })
  userId!: number

  @Column({ name: 'call_at', type: 'datetime' })
  callAt!: Date

  @Column({ type: 'int', default: 0, comment: 'Duration in seconds' })
  duration!: number

  @Column({ type: 'text', nullable: true })
  notes!: string

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary!: string

  @Column({ name: 'recording_url', length: 500, nullable: true })
  recordingUrl!: string
}
