import { Entity, Column, Index, Unique, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingVideo } from './training-video.entity'

@Entity('video_progress')
@Unique('UQ_video_progress_user_video', ['userId', 'videoId'])
export class VideoProgress extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Index()
  @Column({ name: 'video_id', type: 'int' })
  videoId!: number

  @Column({ name: 'watched_seconds', type: 'int', default: 0 })
  watchedSeconds!: number

  @Column({ name: 'last_position', type: 'int', default: 0 })
  lastPosition!: number

  @Column({ name: 'completion_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate!: number

  @Column({ name: 'is_completed', type: 'tinyint', default: 0 })
  isCompleted!: boolean

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null

  @ManyToOne(() => TrainingVideo, (v) => v.progressRecords, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'video_id' })
  video?: TrainingVideo
}
