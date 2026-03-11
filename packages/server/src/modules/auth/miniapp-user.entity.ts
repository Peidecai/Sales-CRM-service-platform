import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity('miniapp_users')
export class MiniappUser extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', nullable: true, comment: '关联系统用户ID' })
  userId!: number

  @Index({ unique: true })
  @Column({ length: 64, comment: '微信 openid' })
  openid!: string

  @Column({ name: 'union_id', length: 64, nullable: true, comment: '微信 unionId' })
  unionId!: string

  @Column({
    name: 'session_key',
    length: 128,
    nullable: true,
    comment: '微信 session_key（加密存储）',
  })
  sessionKey!: string

  @Column({ length: 20, nullable: true, comment: '绑定手机号' })
  phone!: string

  @Column({ length: 64, nullable: true, comment: '微信昵称' })
  nickname!: string

  @Column({ length: 255, nullable: true, comment: '微信头像' })
  avatarUrl!: string
}
