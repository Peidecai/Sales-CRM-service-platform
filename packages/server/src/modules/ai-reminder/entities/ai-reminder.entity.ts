import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { AiReminderType, AiReminderPriority, AiReminderFeedback } from '@crm/shared'

@Entity('ai_reminders')
export class AiReminder extends BaseEntity {
  @Index()
  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ type: 'varchar', length: 50 })
  type!: AiReminderType

  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'varchar', length: 20, default: AiReminderPriority.MEDIUM })
  priority!: AiReminderPriority

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean

  @Column({ type: 'varchar', length: 20, nullable: true })
  feedback!: AiReminderFeedback | null

  @Column({ name: 'feedback_at', type: 'datetime', nullable: true })
  feedbackAt!: Date | null

  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
  scheduledAt!: Date | null
}
