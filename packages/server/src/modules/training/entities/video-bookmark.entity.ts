import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingVideo } from './training-video.entity'

@Entity('video_bookmarks')
export class VideoBookmark extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Index()
  @Column({ name: 'video_id', type: 'int' })
  videoId!: number

  @Column({ type: 'int' })
  timestamp!: number

  @Column({ type: 'text', nullable: true })
  note!: string | null

  @ManyToOne(() => TrainingVideo, (v) => v.bookmarks, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'video_id' })
  video?: TrainingVideo
}
