import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ProspectChannel } from '@crm/shared'

@Entity('prospect_search_logs')
export class ProspectSearchLog extends BaseEntity {
  @Column({ name: 'user_id', type: 'int', comment: '搜索用户ID' })
  userId!: number

  @Column({ type: 'enum', enum: ProspectChannel, comment: '搜索渠道' })
  channel!: ProspectChannel

  @Column({ type: 'json', comment: '搜索条件' })
  query!: Record<string, unknown>

  @Column({ name: 'result_count', type: 'int', default: 0, comment: '搜索结果数' })
  resultCount!: number

  @Column({ name: 'imported_count', type: 'int', default: 0, comment: '导入数' })
  importedCount!: number

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0, comment: 'API调用费用' })
  cost!: number

  @Column({ type: 'varchar', length: 20, default: 'completed', comment: '搜索状态' })
  status!: string
}
