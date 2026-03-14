import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { AnnouncementPriority } from '@crm/shared'

export enum AnnouncementChannel {
  WEB = 'WEB',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WECHAT = 'WECHAT',
}

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

  /** Delivery channels — stored as comma-separated values, defaults to WEB */
  @Column({ type: 'simple-array', default: 'WEB' })
  channels!: AnnouncementChannel[]

  /** Target roles — empty/null means all roles */
  @Column({ name: 'target_roles', type: 'simple-array', nullable: true })
  targetRoles!: string[] | null

  @Column({ name: 'publish_at', type: 'datetime', nullable: true })
  publishAt!: Date | null

  @Column({ name: 'end_at', type: 'datetime', nullable: true })
  endAt!: Date | null

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null
}
