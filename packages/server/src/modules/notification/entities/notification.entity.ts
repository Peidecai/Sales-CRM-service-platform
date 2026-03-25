import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('notifications')
@Index('idx_notifications_user_read', ['userId', 'isRead'])
@Index('idx_notifications_type', ['type'])
@Index('idx_notifications_created_at', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number

  /** Recipient user ID. 0 = broadcast to all users */
  @Column({ type: 'int' })
  userId!: number

  @Column({ type: 'varchar', length: 50 })
  type!: string

  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'boolean', default: false })
  isRead!: boolean

  /** Related resource ID (e.g. customerId, opportunityId) */
  @Column({ type: 'int', nullable: true })
  relatedId!: number | null

  /** Related resource type (e.g. 'customer', 'opportunity') */
  @Column({ type: 'varchar', length: 50, nullable: true })
  relatedType!: string | null

  @CreateDateColumn()
  createdAt!: Date
}
