import { Entity, Column, Index, Unique } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('customer_sim_bindings')
@Unique('UQ_csb_user_customer', ['userId', 'customerId'])
export class CustomerSimBinding extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number

  @Column({ name: 'sim_slot', type: 'int', comment: 'SIM 卡槽位(0=SIM1, 1=SIM2)' })
  simSlot!: number

  @Column({ type: 'text', nullable: true })
  reason!: string | null
}
