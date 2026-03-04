import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('knowledge_categories')
export class KnowledgeCategory extends BaseEntity {
  @Column({ length: 100 })
  name!: string

  @Column({ name: 'parent_id', type: 'int', nullable: true, default: null })
  parentId!: number | null

  @Column({ type: 'int', default: 0 })
  sort!: number

  @Column({ length: 200, nullable: true })
  description!: string
}
