import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { SpeechTemplate } from './speech-template.entity'
import { CallRecord } from '../../call-record/call-record.entity'

@Entity('speech_annotations')
export class SpeechAnnotation extends BaseEntity {
  @Column({ name: 'call_record_id', type: 'int' })
  callRecordId!: number

  @ManyToOne(() => CallRecord)
  @JoinColumn({ name: 'call_record_id' })
  callRecord!: CallRecord

  @Column({ name: 'template_id', type: 'int', nullable: true })
  templateId!: number | null

  @ManyToOne(() => SpeechTemplate, (t) => t.annotations, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template!: SpeechTemplate | null

  @Column({ name: 'start_time', type: 'int' })
  startTime!: number

  @Column({ name: 'end_time', type: 'int' })
  endTime!: number

  @Column({ type: 'text' })
  text!: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  comment!: string | null

  @Column({ type: 'int', nullable: true })
  score!: number | null

  @Column({ name: 'annotated_by', type: 'int' })
  annotatedBy!: number
}
