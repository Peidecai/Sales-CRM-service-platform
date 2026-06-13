import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { RepaymentStatus } from '@crm/shared'

@Entity('repayment_plans')
export class RepaymentPlan extends BaseEntity {
  @Index()
  @Column({ name: 'post_loan_id', type: 'int' })
  postLoanId!: number

  @Column({ type: 'int' })
  period!: number

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount!: number

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt!: Date | null

  @Column({
    type: 'enum',
    enum: RepaymentStatus,
    default: RepaymentStatus.PENDING,
  })
  status!: RepaymentStatus
}
