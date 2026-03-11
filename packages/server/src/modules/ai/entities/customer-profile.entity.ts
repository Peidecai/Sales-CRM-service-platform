import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('customer_profiles')
export class CustomerProfile {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'customer_id', type: 'int', unique: true })
  customerId!: number

  @Column({ name: 'disc_type', type: 'varchar', length: 20, nullable: true })
  discType!: string | null

  @Column({ name: 'disc_scores', type: 'json', nullable: true })
  discScores!: { D: number; I: number; S: number; C: number } | null

  @Column({ name: 'communication_style', type: 'text', nullable: true })
  communicationStyle!: string | null

  @Column({ name: 'pain_points', type: 'json', nullable: true })
  painPoints!: string[] | null

  @Column({ name: 'health_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  healthScore!: number | null

  @Column({ name: 'raw_analysis', type: 'json', nullable: true })
  rawAnalysis!: Record<string, unknown> | null

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date

  @Column({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date
}
