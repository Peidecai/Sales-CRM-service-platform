import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingVideo } from './training-video.entity'
import { TrainingTaskAssignee } from './training-task-assignee.entity'

@Entity('training_tasks')
export class TrainingTask extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Index()
  @Column({ name: 'video_id', type: 'int' })
  videoId!: number

  @Column({ name: 'assigned_by_id', type: 'int' })
  assignedById!: number

  @Column({ type: 'datetime' })
  deadline!: Date

  @ManyToOne(() => TrainingVideo, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'video_id' })
  video?: TrainingVideo

  @OneToMany(() => TrainingTaskAssignee, (a) => a.task)
  assignees?: TrainingTaskAssignee[]
}
