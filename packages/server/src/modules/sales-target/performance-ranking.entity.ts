import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, Unique } from 'typeorm'
import { TargetScope, TargetPeriod, TargetMetricType } from '@crm/shared'

@Entity('performance_rankings')
@Unique('UQ_ranking_snapshot', ['snapshotDate', 'year', 'month', 'metricType', 'userId'])
export class PerformanceRanking {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Column({ name: 'user_name', length: 100 })
  userName!: string

  @Column({ type: 'enum', enum: TargetPeriod })
  period!: TargetPeriod

  @Column({ name: 'metric_type', type: 'enum', enum: TargetMetricType })
  metricType!: TargetMetricType

  @Column({ name: 'metric_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  metricValue!: number

  @Column({ type: 'int' })
  rank!: number

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate!: Date

  @Column({ type: 'enum', enum: TargetScope, default: TargetScope.COMPANY })
  scope!: TargetScope

  @Column({ type: 'int' })
  year!: number

  @Column({ type: 'int', nullable: true })
  quarter!: number | null

  @Column({ type: 'int', nullable: true })
  month!: number | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
