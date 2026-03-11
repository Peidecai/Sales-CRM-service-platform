import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type ReportType = 'weekly' | 'monthly'

@Entity('ai_reports')
export class AiReport {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'report_type', type: 'enum', enum: ['weekly', 'monthly'] })
  reportType!: ReportType

  @Column({ name: 'period_value', type: 'varchar', length: 20 })
  periodValue!: string

  @Column({ type: 'json', nullable: true })
  content!: Record<string, unknown> | null

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl!: string | null

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date
}
