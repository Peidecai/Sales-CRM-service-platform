import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity('sys_permissions')
export class SysPermission {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ length: 100 })
  name!: string

  @Column({ length: 100, unique: true })
  code!: string

  @Column({ length: 50 })
  resource!: string

  @Column({ length: 50 })
  action!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
