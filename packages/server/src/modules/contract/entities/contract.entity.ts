import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ContractStatus, ContractType } from '@crm/shared'

@Entity('contracts')
export class Contract extends BaseEntity {
  @Column({ name: 'contract_no', length: 32, unique: true })
  contractNo!: string

  @Column({ length: 200 })
  title!: string

  @Column({
    name: 'contract_type',
    type: 'enum',
    enum: ContractType,
    default: ContractType.SALES,
  })
  contractType!: ContractType

  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Column({ name: 'quotation_id', type: 'int', nullable: true })
  quotationId!: number | null

  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number

  @Column({ name: 'owner_id', type: 'int' })
  ownerId!: number

  @Column({ name: 'our_entity', length: 100 })
  ourEntity!: string

  @Column({ name: 'customer_entity', length: 100 })
  customerEntity!: string

  @Column({ length: 3, default: 'CNY' })
  currency!: string

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount!: number

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount!: number

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string

  @Column({ name: 'sign_date', type: 'date', nullable: true })
  signDate!: string | null

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms!: string | null

  @Column({ name: 'delivery_terms', type: 'text', nullable: true })
  deliveryTerms!: string | null

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status!: ContractStatus

  @Column({ name: 'sign_file_url', length: 500, nullable: true })
  signFileUrl!: string | null

  @Column({ name: 'renewal_reminder_days', type: 'int', default: 30 })
  renewalReminderDays!: number

  @Column({ name: 'parent_contract_id', type: 'int', nullable: true })
  parentContractId!: number | null

  @Column({ type: 'json', nullable: true })
  attachments!: Record<string, unknown>[] | null

  @Column({ name: 'custom_fields', type: 'json', nullable: true })
  customFields!: Record<string, unknown> | null

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number
}
