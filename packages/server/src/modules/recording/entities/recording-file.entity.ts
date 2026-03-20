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
import { RecordingSourceType } from '@crm/shared'

@Entity('recording_files')
export class RecordingFile {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ type: 'int', name: 'call_record_id', comment: '通话记录ID', nullable: true })
  callRecordId!: number | null

  @Column({ type: 'varchar', name: 'file_name', length: 255, nullable: true })
  fileName!: string | null

  @Column({ name: 'oss_key', length: 500, comment: 'OSS 对象键' })
  ossKey!: string

  @Column({ type: 'varchar', name: 'oss_bucket', length: 100, nullable: true })
  ossBucket!: string | null

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: number | null

  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds!: number | null

  @Column({ type: 'varchar', name: 'mime_type', length: 50, nullable: true })
  mimeType!: string | null

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: RecordingSourceType,
    default: RecordingSourceType.PLATFORM,
    comment: '录音来源: platform=平台录音, voice_memo=语音速记, manual_upload=手动上传',
  })
  sourceType!: RecordingSourceType

  @Column({
    type: 'varchar',
    name: 'counterpart_phone',
    length: 20,
    nullable: true,
    comment: '对方电话号码',
  })
  counterpartPhone!: string | null

  @Column({ type: 'datetime', name: 'actual_call_time', nullable: true, comment: '实际通话时间' })
  actualCallTime!: Date | null

  @Column({ type: 'int', name: 'uploaded_by_id', nullable: true, comment: '上传人ID' })
  uploadedById!: number | null

  @Column({ type: 'text', nullable: true, comment: '备注' })
  notes!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date

  @ManyToOne(() => CallRecord, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'call_record_id' })
  callRecord?: CallRecord
}
