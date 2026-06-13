import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { PkTeam } from './pk-team.entity'
import { User } from '../user/user.entity'

@Entity('pk_challenges')
export class Pk extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'varchar', length: 20, default: 'one_on_one' })
  type!: string

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string

  @Column({ type: 'varchar', length: 30 })
  metric!: string

  @Column({ name: 'start_date', type: 'datetime' })
  startDate!: Date

  @Column({ name: 'end_date', type: 'datetime' })
  endDate!: Date

  @Column({ type: 'text', nullable: true })
  stake!: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  result!: string | null

  @Column({ name: 'created_by_id', type: 'int' })
  createdById!: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User

  @OneToMany(() => PkTeam, (team) => team.pk, { cascade: true })
  teams!: PkTeam[]
}
