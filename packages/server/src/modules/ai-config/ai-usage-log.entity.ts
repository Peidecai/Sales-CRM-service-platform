import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  BaseEntity as TypeOrmBaseEntity,
} from 'typeorm'

/**
 * AI usage log — permanent record, no soft delete.
 * Does NOT extend BaseEntity to avoid deletedAt column.
 */
@Entity('ai_usage_logs')
export class AiUsageLog extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @Column({ type: 'varchar', length: 50, comment: '模块标识' })
  module!: string

  @Column({ type: 'varchar', length: 100, comment: '模型名称' })
  model!: string

  @Column({ type: 'int', default: 0, comment: '提示Token数' })
  promptTokens!: number

  @Column({ type: 'int', default: 0, comment: '补全Token数' })
  completionTokens!: number

  @Column({ type: 'int', default: 0, comment: '总Token数' })
  totalTokens!: number

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0, comment: '预估费用' })
  estimatedCost!: number

  @Column({ type: 'int', default: 0, comment: '延迟(ms)' })
  latencyMs!: number

  @Column({ type: 'boolean', default: true, comment: '是否成功' })
  isSuccess!: boolean

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage!: string | null

  @Column({ type: 'int', nullable: true, comment: '触发人ID' })
  triggeredById!: number | null
}
