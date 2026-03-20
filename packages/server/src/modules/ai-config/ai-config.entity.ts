import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity('ai_configs')
export class AiConfig extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, comment: 'AI模块标识' })
  module!: string

  @Column({ type: 'varchar', length: 50, comment: 'AI提供商' })
  provider!: string

  @Column({ type: 'varchar', length: 100, comment: '模型名称' })
  model!: string

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7, comment: '温度' })
  temperature!: number

  @Column({ type: 'int', default: 2000, comment: '最大Token数' })
  maxTokens!: number

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0, comment: 'Top P' })
  topP!: number

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, comment: '频率惩罚' })
  frequencyPenalty!: number

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, comment: '存在惩罚' })
  presencePenalty!: number

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '备用模型' })
  fallbackModel!: string | null

  @Column({ type: 'int', default: 3, comment: '触发备用模型的失败次数阈值' })
  fallbackThreshold!: number

  @Column({ type: 'int', nullable: true, comment: '最后更新人ID' })
  updatedById!: number | null
}
