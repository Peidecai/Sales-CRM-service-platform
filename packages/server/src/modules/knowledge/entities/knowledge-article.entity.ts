import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('knowledge_articles')
export class KnowledgeArticle extends BaseEntity {
  @Column({ length: 300 })
  title!: string

  @Column({ type: 'longtext' })
  content!: string

  @Index()
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null

  @Index()
  @Column({ name: 'author_id' })
  authorId!: number

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount!: number

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  @Column({ name: 'is_published', default: false })
  isPublished!: boolean
}
