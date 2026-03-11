import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { AsrTask } from './asr-task.entity'

export enum TranscriptSpeaker {
  AGENT = 'agent',
  CUSTOMER = 'customer',
  UNKNOWN = 'unknown',
}

@Entity('call_transcripts')
export class CallTranscript {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'asr_task_id', comment: 'ASR任务ID' })
  asrTaskId!: number

  @Column({ name: 'segment_index', nullable: true })
  segmentIndex!: number | null

  @Column({ name: 'start_time_ms', nullable: true })
  startTimeMs!: number | null

  @Column({ name: 'end_time_ms', nullable: true })
  endTimeMs!: number | null

  @Column({
    type: 'enum',
    enum: TranscriptSpeaker,
    default: TranscriptSpeaker.UNKNOWN,
  })
  speaker!: TranscriptSpeaker

  @Column({ type: 'text', nullable: true })
  text!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date

  @ManyToOne(() => AsrTask, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'asr_task_id' })
  asrTask?: AsrTask
}
