import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('employee_badges')
export class EmployeeBadge extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'badge_type', type: 'varchar', length: 50 })
  badgeType!: string

  @Column({ name: 'earned_at', type: 'datetime', precision: 6 })
  earnedAt!: Date

  @Column({ type: 'varchar', length: 7, nullable: true, comment: 'YYYY-MM' })
  month!: string | null
}
