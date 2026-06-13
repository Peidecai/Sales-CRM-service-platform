import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('notification_settings')
export class NotificationSetting {
  @PrimaryGeneratedColumn()
  id!: number

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'email_enabled', default: true })
  emailEnabled!: boolean

  @Column({ name: 'ws_enabled', default: true })
  wsEnabled!: boolean

  @Column({ name: 'sms_enabled', default: false })
  smsEnabled!: boolean

  @Column({ name: 'muted_types', type: 'json', nullable: true })
  mutedTypes!: string[] | null

  @Column({ name: 'quiet_hours_start', type: 'varchar', length: 5, nullable: true })
  quietHoursStart!: string | null

  @Column({ name: 'quiet_hours_end', type: 'varchar', length: 5, nullable: true })
  quietHoursEnd!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
