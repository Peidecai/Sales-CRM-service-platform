import { Entity, Column, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { TrainingVideo } from './training-video.entity'

@Entity('training_categories')
export class TrainingCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 50 })
  type!: string

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @OneToMany(() => TrainingVideo, (v) => v.category)
  videos?: TrainingVideo[]
}
