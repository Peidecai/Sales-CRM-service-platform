import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { User } from '../../user/user.entity'

export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('device_tokens')
export class DeviceToken extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'device_token', type: 'varchar', length: 512 })
  deviceToken!: string

  @Column({ type: 'enum', enum: DevicePlatform })
  platform!: DevicePlatform

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @Column({ name: 'last_used_at', type: 'datetime', nullable: true })
  lastUsedAt!: Date | null

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User
}
