import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { TargetScope, TargetPeriod, TargetMetricType } from '@crm/shared'

@Entity('sales_targets')
export class SalesTarget extends BaseEntity {
  @Column({ length: 200 })
  name!: string

  @Index()
  @Column({ type: 'enum', enum: TargetScope })
  scope!: TargetScope

  @Column({ type: 'enum', enum: TargetPeriod })
  period!: TargetPeriod

  @Index()
  @Column({ name: 'metric_type', type: 'enum', enum: TargetMetricType })
  metricType!: TargetMetricType

  @Column({ name: 'target_value', type: 'decimal', precision: 14, scale: 2, default: 0 })
  targetValue!: number

  @Column({ name: 'achieved_value', type: 'decimal', precision: 14, scale: 2, default: 0 })
  achievedValue!: number

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'int', nullable: true })
  quarter!: number | null

  @Column({ type: 'int', nullable: true })
  month!: number | null

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date

  @Index()
  @Column({ name: 'assigned_user_id', nullable: true })
  assignedUserId!: number | null

  @Column({ name: 'team_id', length: 100, nullable: true })
  teamId!: string | null

  @Index()
  @Column({ name: 'parent_target_id', nullable: true })
  parentTargetId!: number | null

  // Self-referencing relations for target decomposition
  @ManyToOne(() => SalesTarget, (t) => t.children, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'parent_target_id' })
  parent!: SalesTarget | null

  @OneToMany(() => SalesTarget, (t) => t.parent)
  children!: SalesTarget[]
}
