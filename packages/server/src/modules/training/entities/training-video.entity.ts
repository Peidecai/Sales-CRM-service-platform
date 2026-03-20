import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingCategory } from './training-category.entity'
import { VideoChapter } from './video-chapter.entity'
import { VideoProgress } from './video-progress.entity'
import { VideoBookmark } from './video-bookmark.entity'

@Entity('training_videos')
export class TrainingVideo extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl!: string

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl!: string | null

  @Column({ type: 'int' })
  duration!: number

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: number

  @Column({ type: 'varchar', length: 20 })
  format!: string

  @Index()
  @Column({ name: 'category_id', type: 'int' })
  categoryId!: number

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @Column({ name: 'is_published', type: 'tinyint', default: 0 })
  isPublished!: boolean

  @Column({ name: 'uploaded_by_id', type: 'int' })
  uploadedById!: number

  @ManyToOne(() => TrainingCategory, (c) => c.videos, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'category_id' })
  category?: TrainingCategory

  @OneToMany(() => VideoChapter, (ch) => ch.video)
  chapters?: VideoChapter[]

  @OneToMany(() => VideoProgress, (p) => p.video)
  progressRecords?: VideoProgress[]

  @OneToMany(() => VideoBookmark, (b) => b.video)
  bookmarks?: VideoBookmark[]
}
