import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { KnowledgeCategory } from './knowledge-category.entity'
import { ArticleVisibleScope, ArticleStatus } from '@crm/shared'

@Entity('knowledge_articles')
export class KnowledgeArticle extends BaseEntity {
  @Column({ length: 300 })
  title!: string

  @Column({ type: 'longtext' })
  content!: string

  @Column({ length: 500, nullable: true })
  summary!: string | null

  @Column({ name: 'cover_image', length: 500, nullable: true })
  coverImage!: string | null

  @Index()
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null

  // ---- Relations ----

  @ManyToOne(() => KnowledgeCategory, (c) => c.articles, {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category!: KnowledgeCategory | null

  @Index()
  @Column({ name: 'author_id' })
  authorId!: number

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount!: number

  @Column({ name: 'collect_count', type: 'int', default: 0 })
  collectCount!: number

  @Column({ name: 'comment_count', type: 'int', default: 0 })
  commentCount!: number

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[]

  @Column({ name: 'is_published', default: false })
  isPublished!: boolean

  @Column({ name: 'is_top', default: false })
  isTop!: boolean

  @Column({ name: 'is_recommend', default: false })
  isRecommend!: boolean

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number

  @Column({ name: 'publish_time', type: 'datetime', nullable: true })
  publishTime!: Date | null

  @Column({ name: 'review_id', type: 'int', nullable: true })
  reviewId!: number | null

  @Column({ name: 'review_remark', type: 'text', nullable: true })
  reviewRemark!: string | null

  @Column({ name: 'review_time', type: 'datetime', nullable: true })
  reviewTime!: Date | null

  @Column({ length: 50, nullable: true })
  source!: string | null

  @Column({
    name: 'visible_scope',
    type: 'enum',
    enum: ArticleVisibleScope,
    default: ArticleVisibleScope.ALL,
  })
  visibleScope!: ArticleVisibleScope

  @Column({ name: 'visible_target', type: 'json', nullable: true })
  visibleTarget!: Record<string, unknown> | null

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status!: ArticleStatus
}
