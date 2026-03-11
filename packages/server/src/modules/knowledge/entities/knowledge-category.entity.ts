import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { KnowledgeCategoryType } from '@crm/shared'
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

  @Column({ name: 'category_code', length: 50, nullable: true, unique: true })
  categoryCode!: string | null

  @Column({
    name: 'category_type',
    type: 'enum',
    enum: KnowledgeCategoryType,
    default: KnowledgeCategoryType.PRODUCT,
  })
  categoryType!: KnowledgeCategoryType

  @Column({ name: 'icon_url', length: 500, nullable: true })
  iconUrl!: string | null

  @Column({ type: 'tinyint', default: 1 })
  level!: number

  @Column({ length: 200, nullable: true })
  path!: string | null

  @Column({ name: 'article_count', type: 'int', default: 0 })
  articleCount!: number

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
