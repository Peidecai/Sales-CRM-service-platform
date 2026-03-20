import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import type { GroupRule } from '@crm/shared'

@Entity('customer_groups')
export class CustomerGroup extends BaseEntity {
  @Column({ length: 100, comment: '分组名称' })
  name!: string

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '描述' })
  description!: string | null

  @Index()
  @Column({ type: 'varchar', length: 20, comment: '类型: static | dynamic' })
  type!: 'static' | 'dynamic'

  @Column({ type: 'json', nullable: true, comment: '动态分组规则' })
  rules!: GroupRule[] | null

  @Column({ name: 'member_count', type: 'int', default: 0, comment: '成员数' })
  memberCount!: number

  @Column({ name: 'last_refreshed_at', type: 'datetime', nullable: true, comment: '最后刷新时间' })
  lastRefreshedAt!: Date | null

  @Index()
  @Column({ name: 'created_by_id', type: 'int', comment: '创建人ID' })
  createdById!: number
}
