import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { PaymentPlan } from './payment-plan.entity'

@Entity('payment_plan_items')
export class PaymentPlanItem extends BaseEntity {
  @Index()
  @Column({ name: 'plan_id', type: 'int' })
  planId!: number

  @ManyToOne(() => PaymentPlan, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'plan_id' })
  plan!: PaymentPlan

  @Column({ name: 'installment_no', type: 'int' })
  installmentNo!: number

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt!: Date | null

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: string // pending | paid | partial | overdue | bad_debt

  @Column({ type: 'varchar', length: 500, nullable: true })
  remark!: string | null
}
