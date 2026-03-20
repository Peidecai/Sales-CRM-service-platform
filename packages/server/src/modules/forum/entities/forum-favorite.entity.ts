import { Entity, Column, Index, Unique } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('forum_favorites')
@Unique('UQ_forum_favorite_user_post', ['userId', 'postId'])
export class ForumFavorite extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int', comment: '用户ID' })
  userId!: number

  @Column({ name: 'post_id', type: 'int', comment: '帖子ID' })
  postId!: number
}
