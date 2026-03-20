import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('reminder_settings')
export class ReminderSetting extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', comment: '用户ID，0表示全局默认' })
  userId!: number

  @Column({
    name: 'default_reminder_time',
    type: 'varchar',
    length: 5,
    default: '09:00',
    comment: '默认提醒时间 HH:mm',
  })
  defaultReminderTime!: string

  @Column({
    name: 'reminder_enabled',
    type: 'boolean',
    default: true,
    comment: '是否启用跟进提醒',
  })
  reminderEnabled!: boolean

  @Column({
    name: 'ai_reminder_enabled',
    type: 'boolean',
    default: true,
    comment: '是否启用AI智能提醒',
  })
  aiReminderEnabled!: boolean

  @Column({
    name: 'inactive_days_threshold',
    type: 'int',
    default: 3,
    comment: 'AI提醒：多少天未联系视为需要提醒',
  })
  inactiveDaysThreshold!: number
}
