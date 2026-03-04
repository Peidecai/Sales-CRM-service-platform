import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { Customer } from '../customer/customer.entity'
import { Opportunity } from '../opportunity/opportunity.entity'

@Entity('call_records')
export class CallRecord extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  @Column({ name: 'opportunity_id', nullable: true })
  opportunityId!: number

  // ---- Relations ----

  @ManyToOne(() => Customer, (c) => c.callRecords, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer

  @ManyToOne(() => Opportunity, (o) => o.callRecords, {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity!: Opportunity | null

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
