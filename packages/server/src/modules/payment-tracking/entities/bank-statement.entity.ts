import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('bank_statements')
export class BankStatement extends BaseEntity {
  @Index()
  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: string

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number

  @Column({ name: 'payer_name', type: 'varchar', length: 200 })
  payerName!: string

  @Column({ name: 'payer_account', type: 'varchar', length: 100, nullable: true })
  payerAccount!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  reference!: string | null

  @Index()
  @Column({ name: 'matched_plan_item_id', type: 'int', nullable: true })
  matchedPlanItemId!: number | null

  @Index()
  @Column({ name: 'match_status', type: 'varchar', length: 30, default: 'unmatched' })
  matchStatus!: string

  @Column({ name: 'imported_by_id', type: 'int' })
  importedById!: number
}
