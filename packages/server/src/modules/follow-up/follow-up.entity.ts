import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { Customer } from '../customer/customer.entity'
import { User } from '../user/user.entity'

export enum FollowUpType {
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  WECHAT = 'wechat',
  OTHER = 'other',
}

@Entity('follow_ups')
export class FollowUp extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Column({ type: 'enum', enum: FollowUpType, default: FollowUpType.CALL })
  type!: FollowUpType

  @Column({ type: 'text' })
  content!: string

  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate?: Date

  @Column({ name: 'next_follow_up_note', length: 500, nullable: true })
  nextFollowUpNote?: string

  @ManyToOne(() => Customer, { lazy: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'user_id' })
  user?: User
}
