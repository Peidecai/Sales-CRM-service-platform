import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { UserRole } from '@crm/shared'

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 50 })
  username!: string

  @Column({ length: 255 })
  password!: string

  @Column({ length: 100, nullable: true })
  email!: string

  @Column({ length: 50 })
  name!: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SALES })
  role!: UserRole

  @Column({ length: 20, nullable: true })
  phone!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean
}
