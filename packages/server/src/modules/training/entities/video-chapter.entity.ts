import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingVideo } from './training-video.entity'

@Entity('video_chapters')
export class VideoChapter extends BaseEntity {
  @Index()
  @Column({ name: 'video_id', type: 'int' })
  videoId!: number

  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ name: 'start_time', type: 'int' })
  startTime!: number

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @ManyToOne(() => TrainingVideo, (v) => v.chapters, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'video_id' })
  video?: TrainingVideo
}
