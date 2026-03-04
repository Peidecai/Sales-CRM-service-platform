import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { OpportunityStage } from '@crm/shared'
import { Customer } from '../customer/customer.entity'
import type { CallRecord } from '../call-record/call-record.entity'

@Entity('opportunities')
export class Opportunity extends BaseEntity {
  @Column({ length: 200 })
  title!: string

  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  // ---- Relations ----

  @ManyToOne(() => Customer, (c) => c.opportunities, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer

  @OneToMany('CallRecord', 'opportunity')
  callRecords!: CallRecord[]

  @Column({ type: 'enum', enum: OpportunityStage, default: OpportunityStage.LEAD })
  stage!: OpportunityStage

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount!: number

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate!: Date

  @Column({ type: 'int', default: 10, comment: 'Win probability 0-100' })
  probability!: number

  @Index()
  @Column({ name: 'assigned_user_id' })
  assignedUserId!: number

  @Column({ type: 'text', nullable: true })
  description!: string
}
