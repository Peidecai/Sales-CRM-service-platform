import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

@Entity('prospect_query_histories')
export class ProspectQueryHistory {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Column({ name: 'query_params', type: 'json' })
  queryParams!: Record<string, unknown>

  @Column({ name: 'result_count', type: 'int', default: 0 })
  resultCount!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
