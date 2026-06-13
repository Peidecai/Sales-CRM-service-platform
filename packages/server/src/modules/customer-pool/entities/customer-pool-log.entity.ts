import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export enum PoolAction {
  RECYCLE = 'recycle',
  CLAIM = 'claim',
  ASSIGN = 'assign',
  RETURN = 'return',
}

@Entity('customer_pool_logs')
export class CustomerPoolLog extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id', comment: '客户ID' })
  customerId!: number

  @Index()
  @Column({ type: 'enum', enum: PoolAction, comment: '操作类型' })
  action!: PoolAction

  @Column({ name: 'from_user_id', nullable: true, comment: '原负责人ID' })
  fromUserId!: number

  @Column({ name: 'to_user_id', nullable: true, comment: '新负责人ID' })
  toUserId!: number

  @Column({ length: 500, nullable: true, comment: '操作原因' })
  reason!: string
}
