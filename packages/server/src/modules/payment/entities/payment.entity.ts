import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { PaymentStatus, PaymentMethod } from '@crm/shared'

@Entity('payments')
export class Payment extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'payment_no', type: 'varchar', length: 32 })
  paymentNo!: string

  @Index()
  @Column({ name: 'contract_id', type: 'int' })
  contractId!: number

  @Index()
  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Index()
  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number

  @Index()
  @Column({ name: 'owner_id', type: 'int' })
  ownerId!: number

  @Column({ name: 'period_no', type: 'int', nullable: true, comment: '分期期号' })
  periodNo!: number | null

  @Column({
    name: 'planned_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    comment: '计划回款金额',
  })
  plannedAmount!: number | null

  @Column({
    name: 'actual_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    comment: '实际回款金额',
  })
  actualAmount!: number | null

  @Index()
  @Column({ name: 'planned_date', type: 'date', nullable: true, comment: '计划回款日期' })
  plannedDate!: Date | null

  @Column({ name: 'actual_date', type: 'date', nullable: true, comment: '实际回款日期' })
  actualDate!: Date | null

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
    comment: '回款方式',
  })
  paymentMethod!: PaymentMethod | null

  @Column({
    name: 'bank_transaction_no',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '银行流水号',
  })
  bankTransactionNo!: string | null

  @Column({ name: 'invoice_no', type: 'varchar', length: 50, nullable: true, comment: '发票号' })
  invoiceNo!: string | null

  @Column({ name: 'is_overdue', type: 'boolean', default: false, comment: '是否逾期' })
  isOverdue!: boolean

  @Column({ name: 'overdue_days', type: 'int', default: 0, comment: '逾期天数' })
  overdueDays!: number

  @Index()
  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PLANNED,
    comment: '回款状态',
  })
  status!: PaymentStatus

  @Column({ name: 'confirm_user_id', type: 'int', nullable: true, comment: '确认人ID' })
  confirmUserId!: number | null

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true, comment: '确认时间' })
  confirmedAt!: Date | null

  @Column({ name: 'remark', type: 'text', nullable: true, comment: '备注' })
  remark!: string | null

  @Column({ name: 'attachments', type: 'json', nullable: true, comment: '附件列表' })
  attachments!: unknown[] | null

  @Column({ name: 'created_by', type: 'int', comment: '创建人ID' })
  createdBy!: number
}
