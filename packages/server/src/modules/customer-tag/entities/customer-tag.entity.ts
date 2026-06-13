import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('customer_tags')
export class CustomerTag extends BaseEntity {
  @Column({ length: 50, unique: true, comment: '标签名称' })
  name!: string

  @Column({ length: 7, default: '#409EFF', comment: '标签颜色(HEX)' })
  color!: string

  @Column({ name: 'group', length: 50, nullable: true, comment: '标签分组' })
  group!: string

  @Column({ default: 0, comment: '排序' })
  sort!: number
}
