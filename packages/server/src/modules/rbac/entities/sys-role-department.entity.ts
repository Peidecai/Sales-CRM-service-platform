import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('sys_role_departments')
export class SysRoleDepartment {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'role_id' })
  roleId!: number

  @Index()
  @Column({ name: 'department_id' })
  departmentId!: number
}
