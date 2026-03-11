import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ai_usage_logs')
export class AiUsageLog {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'trace_id', type: 'varchar', length: 64 })
  traceId!: string

  @Column({ type: 'varchar', length: 50 })
  feature!: string

  @Column({ type: 'varchar', length: 50 })
  model!: string

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens!: number

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens!: number

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost!: number

  @Column({ name: 'latency_ms', type: 'int', default: 0 })
  latencyMs!: number

  @Column({ type: 'varchar', length: 20, default: 'success' })
  status!: string

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId!: number | null

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date
}
