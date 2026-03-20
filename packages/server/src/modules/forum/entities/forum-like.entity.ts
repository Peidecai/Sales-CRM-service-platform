import { Entity, Column, Index, Unique } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('forum_likes')
@Unique('UQ_forum_like_user_target', ['userId', 'targetType', 'targetId'])
export class ForumLike extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int', comment: '用户ID' })
  userId!: number

  @Column({ name: 'target_type', type: 'varchar', length: 20, comment: '目标类型: post|comment' })
  targetType!: 'post' | 'comment'

  @Column({ name: 'target_id', type: 'int', comment: '目标ID' })
  targetId!: number
}
