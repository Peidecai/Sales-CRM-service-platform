import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { Pk } from './pk.entity'
import { PkMember } from './pk-member.entity'

@Entity('pk_teams')
export class PkTeam extends BaseEntity {
  @Column({ name: 'pk_id', type: 'int' })
  pkId!: number

  @ManyToOne(() => Pk, (pk) => pk.teams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pk_id' })
  pk!: Pk

  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 1 })
  side!: string

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  score!: number

  @Column({ name: 'is_winner', type: 'boolean', default: false })
  isWinner!: boolean

  @OneToMany(() => PkMember, (member) => member.team, { cascade: true })
  members!: PkMember[]
}
