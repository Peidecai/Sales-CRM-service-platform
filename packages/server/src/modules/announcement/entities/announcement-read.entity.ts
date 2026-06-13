import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

@Entity('announcement_reads')
@Index(['announcementId', 'userId'], { unique: true })
export class AnnouncementRead {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'announcement_id' })
  announcementId!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @CreateDateColumn({ name: 'read_at', precision: 6 })
  readAt!: Date
}
