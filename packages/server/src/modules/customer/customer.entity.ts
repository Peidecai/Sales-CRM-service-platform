import { Entity, Column, Index, OneToMany } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { CustomerStatus } from '@crm/shared'
import type { Opportunity } from '../opportunity/opportunity.entity'
import type { CallRecord } from '../call-record/call-record.entity'

@Entity('customers')
export class Customer extends BaseEntity {
  // ---- Relations (ORM only, no FK constraint) ----

  @OneToMany('Opportunity', 'customer')
  opportunities!: Opportunity[]

  @OneToMany('CallRecord', 'customer')
  callRecords!: CallRecord[]

  // ---- Columns ----

  @Column({ length: 100 })
  name!: string

  @Column({ length: 200, nullable: true })
  company!: string

  @Column({ length: 20, nullable: true })
  phone!: string

  @Column({ length: 100, nullable: true })
  email!: string

  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.POTENTIAL })
  status!: CustomerStatus

  @Index()
  @Column({ name: 'assigned_user_id' })
  assignedUserId!: number

  @Column({ type: 'text', nullable: true })
  notes!: string

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  @Column({ length: 50, nullable: true })
  industry!: string

  @Column({ length: 20, nullable: true })
  source!: string
}
