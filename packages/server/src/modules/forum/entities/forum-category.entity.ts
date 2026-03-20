import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('forum_categories')
export class ForumCategory extends BaseEntity {
  @Column({ length: 100, comment: '分类名称' })
  name!: string

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '描述' })
  description!: string | null

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '图标' })
  icon!: string | null

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder!: number

  @Column({ name: 'post_count', type: 'int', default: 0, comment: '帖子数' })
  postCount!: number

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean
}
