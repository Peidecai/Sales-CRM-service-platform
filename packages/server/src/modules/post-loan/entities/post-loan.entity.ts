import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { PostLoanStatus } from '@crm/shared'

@Entity('post_loans')
export class PostLoan extends BaseEntity {
  @Index()
  @Column({ name: 'contract_id', type: 'int' })
  contractId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number

  @Column({ name: 'loan_amount', type: 'decimal', precision: 15, scale: 2 })
  loanAmount!: number

  @Column({ name: 'disbursed_at', type: 'datetime' })
  disbursedAt!: Date

  @Index()
  @Column({
    type: 'enum',
    enum: PostLoanStatus,
    default: PostLoanStatus.NORMAL,
  })
  status!: PostLoanStatus

  @Column({ name: 'credit_rating', type: 'varchar', length: 10, nullable: true })
  creditRating!: string | null

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number
}
