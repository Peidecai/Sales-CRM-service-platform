import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('customer_import_logs')
export class CustomerImportLog extends BaseEntity {
  @Column({ name: 'user_id', comment: '操作用户ID' })
  userId!: number

  @Column({ name: 'file_name', length: 200, comment: '文件名' })
  fileName!: string

  @Column({ name: 'total_count', default: 0, comment: '总行数' })
  totalCount!: number

  @Column({ name: 'success_count', default: 0, comment: '成功数' })
  successCount!: number

  @Column({ name: 'fail_count', default: 0, comment: '失败数' })
  failCount!: number

  @Column({ name: 'fail_details', type: 'json', nullable: true, comment: '失败详情' })
  failDetails!: Array<{ row: number; reason: string }> | null

  @Column({ type: 'enum', enum: ImportStatus, default: ImportStatus.PENDING, comment: '状态' })
  status!: ImportStatus
}
