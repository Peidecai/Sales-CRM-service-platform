import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type AlertStatus = 'pending' | 'acknowledged' | 'resolved'

@Entity('ai_alerts')
export class AiAlert {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null

  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  alertType!: string

  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'json', nullable: true })
  detail!: Record<string, unknown> | null

  @Column({ type: 'enum', enum: ['pending', 'acknowledged', 'resolved'], default: 'pending' })
  status!: AlertStatus

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date

  @Column({ name: 'acknowledged_at', type: 'datetime', nullable: true })
  acknowledgedAt!: Date | null

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt!: Date | null
}
