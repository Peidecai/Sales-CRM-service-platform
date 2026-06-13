import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('forum_posts')
export class ForumPost extends BaseEntity {
  @Column({ length: 200, comment: '标题' })
  title!: string

  @Column({ type: 'text', comment: '内容' })
  content!: string

  @Index()
  @Column({ name: 'category_id', type: 'int', comment: '分类ID' })
  categoryId!: number

  @Index()
  @Column({ name: 'author_id', type: 'int', comment: '作者ID' })
  authorId!: number

  @Column({ name: 'is_pinned', type: 'boolean', default: false, comment: '是否置顶' })
  isPinned!: boolean

  @Column({ name: 'is_featured', type: 'boolean', default: false, comment: '是否精华' })
  isFeatured!: boolean

  @Column({ name: 'is_locked', type: 'boolean', default: false, comment: '是否锁定' })
  isLocked!: boolean

  @Column({ name: 'view_count', type: 'int', default: 0, comment: '浏览数' })
  viewCount!: number

  @Column({ name: 'like_count', type: 'int', default: 0, comment: '点赞数' })
  likeCount!: number

  @Column({ name: 'comment_count', type: 'int', default: 0, comment: '评论数' })
  commentCount!: number

  @Column({ name: 'linked_article_id', type: 'int', nullable: true, comment: '关联知识库文章ID' })
  linkedArticleId!: number | null

  @Column({ name: 'last_comment_at', type: 'datetime', nullable: true, comment: '最后评论时间' })
  lastCommentAt!: Date | null
}
