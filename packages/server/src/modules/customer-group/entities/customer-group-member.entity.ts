import { Entity, Column, Index, Unique } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('customer_group_members')
@Unique('UQ_group_customer', ['groupId', 'customerId'])
export class CustomerGroupMember extends BaseEntity {
  @Index()
  @Column({ name: 'group_id', type: 'int', comment: '分组ID' })
  groupId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int', comment: '客户ID' })
  customerId!: number
}
