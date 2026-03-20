import { Entity, Column, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('exam_question_categories')
export class QuestionCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId!: number | null

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @OneToMany(() => QuestionCategory, (c) => c.parentId)
  children?: QuestionCategory[]
}
