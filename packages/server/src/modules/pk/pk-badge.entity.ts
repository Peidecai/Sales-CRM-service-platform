import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { User } from '../user/user.entity'

@Entity('pk_badges')
export class PkBadge extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ type: 'varchar', length: 50 })
  type!: string

  @Column({ name: 'pk_id', type: 'int', nullable: true })
  pkId!: number | null
}
