import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('payment_plans')
export class PaymentPlan extends BaseEntity {
  @Index()
  @Column({ name: 'contract_id', type: 'int' })
  contractId!: number

  @Column({ name: 'plan_name', type: 'varchar', length: 100 })
  planName!: string

  @Column({ name: 'total_installments', type: 'int', default: 1 })
  totalInstallments!: number

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number

  @Column({ name: 'split_method', type: 'varchar', length: 30, default: 'equal' })
  splitMethod!: string

  @Index()
  @Column({ name: 'sales_user_id', type: 'int' })
  salesUserId!: number
}
