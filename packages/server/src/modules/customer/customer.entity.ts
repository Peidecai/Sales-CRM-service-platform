import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { CustomerStatus } from '@crm/shared'

@Entity('customers')
export class Customer extends BaseEntity {
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
