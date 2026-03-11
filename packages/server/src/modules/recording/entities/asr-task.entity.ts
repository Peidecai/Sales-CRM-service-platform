import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { RecordingFile } from './recording-file.entity'

export enum AsrTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('asr_tasks')
export class AsrTask {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'recording_file_id', comment: '录音文件ID' })
  recordingFileId!: number

  @Column({
    type: 'enum',
    enum: AsrTaskStatus,
    default: AsrTaskStatus.PENDING,
  })
  status!: AsrTaskStatus

  @Column({ length: 50, nullable: true })
  provider!: string | null

  @Column({ name: 'external_task_id', length: 100, nullable: true })
  externalTaskId!: string | null

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt!: Date | null

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date

  @ManyToOne(() => RecordingFile, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'recording_file_id' })
  recordingFile?: RecordingFile
}
