import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum CampaignTaskStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('campaign_tasks')
export class CampaignTask {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 200 })
  name!: string

  @Column({
    type: 'enum',
    enum: CampaignTaskStatus,
    default: CampaignTaskStatus.DRAFT,
  })
  status!: CampaignTaskStatus

  @Column({ name: 'total_count', default: 0 })
  totalCount!: number

  @Column({ name: 'completed_count', default: 0 })
  completedCount!: number

  @Column({ name: 'success_count', default: 0 })
  successCount!: number

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt!: Date | null

  @Column({ name: 'ended_at', type: 'datetime', nullable: true })
  endedAt!: Date | null

  @Column({ name: 'created_by' })
  createdBy!: number

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date
}
