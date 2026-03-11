import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('sys_user_roles')
export class SysUserRole {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'user_id' })
  userId!: number

  @Column({ name: 'role_id' })
  roleId!: number
}
