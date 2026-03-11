import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { AnnouncementPriority } from '@crm/shared'

@Entity('announcements')
export class Announcement extends BaseEntity {
  @Column({ length: 200 })
  title!: string

  @Column({ type: 'text', nullable: true })
  content!: string | null

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.NORMAL,
  })
  priority!: AnnouncementPriority

  @Column({ name: 'is_pinned', default: false })
  isPinned!: boolean

  @Column({ name: 'publish_at', type: 'datetime', nullable: true })
  publishAt!: Date | null

  @Column({ name: 'end_at', type: 'datetime', nullable: true })
  endAt!: Date | null

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null
}
