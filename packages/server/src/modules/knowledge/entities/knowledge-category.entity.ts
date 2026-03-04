import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import type { KnowledgeArticle } from './knowledge-article.entity'

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

  // ---- Relations ----

  @ManyToOne('KnowledgeCategory', 'children', {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: KnowledgeCategory | null

  @OneToMany('KnowledgeCategory', 'parent')
  children!: KnowledgeCategory[]

  @OneToMany('KnowledgeArticle', 'category')
  articles!: KnowledgeArticle[]
}
