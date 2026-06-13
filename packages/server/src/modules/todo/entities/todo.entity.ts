import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TodoCategory, TodoPriority, TodoStatus } from '@crm/shared'

@Entity('todos')
@Index(['userId', 'status'])
@Index(['userId', 'dueDate'])
export class Todo extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ length: 200 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'varchar', length: 20, default: TodoCategory.OTHER })
  category!: TodoCategory

  @Column({ type: 'varchar', length: 20, default: TodoPriority.MEDIUM })
  priority!: TodoPriority

  @Column({ type: 'varchar', length: 20, default: TodoStatus.PENDING })
  status!: TodoStatus

  @Column({ name: 'due_date', type: 'datetime', nullable: true })
  dueDate!: Date | null

  @Column({ name: 'related_type', type: 'varchar', length: 50, nullable: true })
  relatedType!: string | null

  @Column({ name: 'related_id', type: 'int', nullable: true })
  relatedId!: number | null

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null
}
