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

  @Column({ name: 'customer_id', nullable: true })
  customerId!: number | null

  @Column({ name: 'contact_id', nullable: true })
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

  @Column({ name: 'call_record_id', nullable: true })
  callRecordId!: number | null

  @Column({ name: 'dial_at', type: 'datetime', nullable: true })
  dialAt!: Date | null

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date
}
