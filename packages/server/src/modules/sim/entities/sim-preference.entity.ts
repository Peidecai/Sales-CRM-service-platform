import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('sim_preferences')
export class SimPreference extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({
    name: 'default_slot',
    type: 'int',
    default: 0,
    comment: '默认 SIM 卡槽位(0=SIM1, 1=SIM2)',
  })
  defaultSlot!: number

  @Column({ name: 'sim1_number', type: 'varchar', length: 20, nullable: true })
  sim1Number!: string | null

  @Column({ name: 'sim1_carrier', type: 'varchar', length: 20, nullable: true })
  sim1Carrier!: string | null

  @Column({ name: 'sim2_number', type: 'varchar', length: 20, nullable: true })
  sim2Number!: string | null

  @Column({ name: 'sim2_carrier', type: 'varchar', length: 20, nullable: true })
  sim2Carrier!: string | null

  @Column({ name: 'last_detected_at', type: 'datetime', nullable: true })
  lastDetectedAt!: Date | null
}
