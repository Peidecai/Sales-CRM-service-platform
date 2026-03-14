import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity('agent_status_logs')
export class AgentStatusLog {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'agent_id', comment: '坐席ID' })
  agentId!: number

  @Column({ type: 'varchar', name: 'from_status', length: 20, nullable: true })
  fromStatus!: string | null

  @Column({ name: 'to_status', length: 20 })
  toStatus!: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date
}
