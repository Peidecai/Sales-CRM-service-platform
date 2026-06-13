import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { User } from '../../user/user.entity'

@Entity('unicom_phone_bindings')
export class UnicomPhoneBinding extends BaseEntity {
  @Index('IDX_unicom_phone_bindings_phone', { unique: true })
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string

  @Index('IDX_unicom_phone_bindings_user_id')
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Index('IDX_unicom_phone_bindings_enabled')
  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true })
  remark!: string | null

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'user_id' })
  user?: User
}
