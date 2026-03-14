import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('intent_predictions')
export class IntentPrediction {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number

  @Index()
  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Column({ name: 'purchase_probability', type: 'decimal', precision: 5, scale: 2, default: 0 })
  purchaseProbability!: number

  @Column({ name: 'predicted_close_date', type: 'date', nullable: true })
  predictedCloseDate!: string | null

  @Column({ name: 'positive_signals', type: 'json', nullable: true })
  positiveSignals!: string[] | null

  @Column({ name: 'negative_signals', type: 'json', nullable: true })
  negativeSignals!: string[] | null

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
