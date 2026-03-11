import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('competitor_reports')
export class CompetitorReport {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null

  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Column({ name: 'competitor_name', type: 'varchar', length: 100 })
  competitorName!: string

  @Column({ name: 'win_lose', type: 'varchar', length: 20, nullable: true })
  winLose!: string | null

  @Column({ type: 'text', nullable: true })
  summary!: string | null

  @Column({ name: 'mentioned_at', type: 'datetime', precision: 6, nullable: true })
  mentionedAt!: Date | null

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date
}
