import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ExamPaper } from './exam-paper.entity'
import { ExamSessionStatus } from '@crm/shared'
import type { ExamAnswer } from '@crm/shared'

@Entity('exam_sessions')
export class ExamSession extends BaseEntity {
  @Column({ name: 'paper_id', type: 'int' })
  paperId!: number

  @ManyToOne(() => ExamPaper)
  @JoinColumn({ name: 'paper_id' })
  paper!: ExamPaper

  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ type: 'varchar', length: 30, default: ExamSessionStatus.NOT_STARTED })
  status!: string

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt!: Date | null

  @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
  submittedAt!: Date | null

  @Column({ name: 'total_score', type: 'int', nullable: true })
  totalScore!: number | null

  @Column({
    type: 'tinyint',
    nullable: true,
    transformer: {
      to: (v: boolean | null) => (v === null ? null : v ? 1 : 0),
      from: (v: number | null) => (v === null ? null : v === 1),
    },
  })
  passed!: boolean | null

  @Column({ type: 'json', nullable: true })
  answers!: ExamAnswer[] | null

  @Column({ name: 'attempt_no', type: 'int', default: 1 })
  attemptNo!: number
}
