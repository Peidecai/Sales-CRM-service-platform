import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Column({ length: 50 })
  username!: string

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction

  @Index()
  @Column({ length: 50 })
  resource!: string

  @Column({ name: 'resource_id', nullable: true })
  resourceId!: number

  @Column({ type: 'json', nullable: true })
  before!: Record<string, unknown> | null

  @Column({ type: 'json', nullable: true })
  after!: Record<string, unknown> | null

  @Column({ length: 50, nullable: true })
  ip!: string

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
