import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import type { RandomPaperConfig } from '@crm/shared'

@Entity('exam_papers')
export class ExamPaper extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null

  @Column({ name: 'build_mode', type: 'varchar', length: 20 })
  buildMode!: string

  @Column({ name: 'random_config', type: 'json', nullable: true })
  randomConfig!: RandomPaperConfig | null

  @Column({ name: 'total_score', type: 'int' })
  totalScore!: number

  @Column({ name: 'pass_score', type: 'int' })
  passScore!: number

  @Column({ type: 'int' })
  duration!: number

  @Column({ name: 'created_by_id', type: 'int' })
  createdById!: number
}
