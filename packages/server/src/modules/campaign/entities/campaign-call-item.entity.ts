import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

export enum CampaignCallStatus {
  PENDING = 'pending',
  CALLING = 'calling',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NO_ANSWER = 'no_answer',
}

@Entity('campaign_call_items')
export class CampaignCallItem {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'campaign_task_id' })
  campaignTaskId!: number

  @Index()
  @Column({ type: 'int', name: 'customer_id', nullable: true })
  customerId!: number | null

  @Index()
  @Column({ type: 'int', name: 'contact_id', nullable: true })
  contactId!: number | null

  @Column({ length: 20 })
  phone!: string

  @Column({
    name: 'call_status',
    type: 'enum',
    enum: CampaignCallStatus,
    default: CampaignCallStatus.PENDING,
  })
  callStatus!: CampaignCallStatus

  @Index()
  @Column({ type: 'int', name: 'call_record_id', nullable: true })
  callRecordId!: number | null

  @Column({ name: 'dial_at', type: 'datetime', nullable: true })
  dialAt!: Date | null

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date
}
