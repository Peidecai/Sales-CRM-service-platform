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

  @Column({ type: 'varchar', length: 50, nullable: true })
  module!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null

  @Column({ type: 'int', default: 0 })
  sort!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
