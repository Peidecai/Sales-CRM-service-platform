import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { AnnotationTargetType } from '@crm/shared'

@Entity('annotations')
@Index(['targetType', 'targetId'])
@Index(['userId'])
export class Annotation extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'target_type', type: 'varchar', length: 30 })
  targetType!: AnnotationTargetType

  @Column({ name: 'target_id', type: 'int' })
  targetId!: number

  @Column({ type: 'text' })
  content!: string

  @Column({ name: 'page_x', type: 'float', nullable: true })
  pageX!: number | null

  @Column({ name: 'page_y', type: 'float', nullable: true })
  pageY!: number | null

  @Column({ default: false })
  resolved!: boolean

  @Column({ name: 'resolved_by_id', type: 'int', nullable: true })
  resolvedById!: number | null

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt!: Date | null
}
