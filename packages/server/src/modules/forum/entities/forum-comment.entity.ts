import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('forum_comments')
export class ForumComment extends BaseEntity {
  @Index()
  @Column({ name: 'post_id', type: 'int', comment: '帖子ID' })
  postId!: number

  @Index()
  @Column({ name: 'author_id', type: 'int', comment: '作者ID' })
  authorId!: number

  @Column({ type: 'text', comment: '内容' })
  content!: string

  @Index()
  @Column({ name: 'parent_id', type: 'int', nullable: true, comment: '父评论ID' })
  parentId!: number | null

  @Column({ name: 'reply_to_user_id', type: 'int', nullable: true, comment: '回复目标用户ID' })
  replyToUserId!: number | null

  @Column({ name: 'like_count', type: 'int', default: 0, comment: '点赞数' })
  likeCount!: number
}
