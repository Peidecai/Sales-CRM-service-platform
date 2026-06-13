import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ApprovalAction } from '@crm/shared'

/**
 * 审批操作记录
 * 记录每个审批节点上审批人的具体动作
 */
@Entity('approval_records')
export class ApprovalRecord extends BaseEntity {
  /** 关联的审批实例 ID */
  @Column({ name: 'instance_id', type: 'int' })
  instanceId!: number

  /** 节点 ID（对应流程定义中 nodes[].id） */
  @Column({ name: 'node_id', type: 'varchar', length: 50 })
  nodeId!: string

  /** 节点名称（冗余存储，避免流程变更后历史数据丢失） */
  @Column({ name: 'node_name', type: 'varchar', length: 100 })
  nodeName!: string

  /** 审批人 ID */
  @Column({ name: 'approver_id', type: 'int' })
  approverId!: number

  /** 审批动作 */
  @Column({
    type: 'enum',
    enum: ApprovalAction,
  })
  action!: ApprovalAction

  /** 审批意见 */
  @Column({ type: 'text', nullable: true })
  opinion!: string | null

  /**
   * 附件信息（JSON 数组）
   * 示例：[{ name:"合同扫描件.pdf", url:"https://..." }]
   */
  @Column({ type: 'json', nullable: true })
  attachments!: Array<{ name: string; url: string }> | null

  /** 审批耗时（分钟），从收到任务到操作完成的时长 */
  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes!: number | null
}
