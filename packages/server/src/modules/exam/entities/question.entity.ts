import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { QuestionCategory } from './question-category.entity'

@Entity('exam_questions')
export class Question extends BaseEntity {
  @Column({ type: 'varchar', length: 30 })
  type!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'json' })
  options!: Array<{ label: string; content: string }>

  @Column({ type: 'json' })
  answer!: string[]

  @Column({ type: 'text', nullable: true })
  explanation!: string | null

  @Column({ name: 'category_id', type: 'int' })
  categoryId!: number

  @ManyToOne(() => QuestionCategory)
  @JoinColumn({ name: 'category_id' })
  category!: QuestionCategory

  @Column({ type: 'int', default: 1 })
  difficulty!: number

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount!: number

  @Column({ name: 'correct_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  correctRate!: number

  @Column({ name: 'linked_article_id', type: 'int', nullable: true })
  linkedArticleId!: number | null

  @Column({ name: 'created_by_id', type: 'int' })
  createdById!: number
}
