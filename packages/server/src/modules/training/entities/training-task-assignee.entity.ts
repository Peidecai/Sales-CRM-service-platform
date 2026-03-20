import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingTask } from './training-task.entity'

@Entity('training_task_assignees')
@Unique('UQ_training_task_assignee', ['taskId', 'userId'])
export class TrainingTaskAssignee extends BaseEntity {
  @Index()
  @Column({ name: 'task_id', type: 'int' })
  taskId!: number

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'is_completed', type: 'tinyint', default: 0 })
  isCompleted!: boolean

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null

  @ManyToOne(() => TrainingTask, (t) => t.assignees, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'task_id' })
  task?: TrainingTask
}
