import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm'
import { CallRecord } from '../../call-record/call-record.entity'

@Entity('recording_files')
export class RecordingFile {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'call_record_id', comment: '通话记录ID' })
  callRecordId!: number

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName!: string | null

  @Column({ name: 'oss_key', length: 500, comment: 'OSS 对象键' })
  ossKey!: string

  @Column({ name: 'oss_bucket', length: 100, nullable: true })
  ossBucket!: string | null

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: number | null

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds!: number | null

  @Column({ name: 'mime_type', length: 50, nullable: true })
  mimeType!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date

  @ManyToOne(() => CallRecord, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'call_record_id' })
  callRecord?: CallRecord
}
