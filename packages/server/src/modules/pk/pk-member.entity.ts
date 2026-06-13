import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { PkTeam } from './pk-team.entity'
import { User } from '../user/user.entity'

@Entity('pk_members')
@Unique('UQ_pk_members_pk_user', ['pkId', 'userId'])
export class PkMember extends BaseEntity {
  @Column({ name: 'team_id', type: 'int' })
  teamId!: number

  @ManyToOne(() => PkTeam, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: PkTeam

  @Column({ name: 'pk_id', type: 'int' })
  pkId!: number

  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  contribution!: number
}
