import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type ForecastPeriodType = '1month' | '3month' | '6month'

@Entity('sales_forecasts')
export class SalesForecast {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'period_type', type: 'enum', enum: ['1month', '3month', '6month'] })
  periodType!: ForecastPeriodType

  @Column({ name: 'period_value', type: 'varchar', length: 20 })
  periodValue!: string

  @Column({ name: 'forecast_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  forecastAmount!: number

  @Column({ name: 'confidence_low', type: 'decimal', precision: 15, scale: 2, default: 0 })
  confidenceLow!: number

  @Column({ name: 'confidence_high', type: 'decimal', precision: 15, scale: 2, default: 0 })
  confidenceHigh!: number

  @Column({ type: 'json', nullable: true })
  assumptions!: Record<string, unknown> | null

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
