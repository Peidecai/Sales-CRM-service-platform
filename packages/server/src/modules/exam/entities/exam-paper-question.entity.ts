import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ExamPaper } from './exam-paper.entity'
import { Question } from './question.entity'

@Entity('exam_paper_questions')
@Unique(['paperId', 'questionId'])
export class ExamPaperQuestion extends BaseEntity {
  @Column({ name: 'paper_id', type: 'int' })
  paperId!: number

  @ManyToOne(() => ExamPaper)
  @JoinColumn({ name: 'paper_id' })
  paper!: ExamPaper

  @Column({ name: 'question_id', type: 'int' })
  questionId!: number

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question!: Question

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'int' })
  score!: number
}
