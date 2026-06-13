import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ApprovalBizType, ApprovalStatus } from '@crm/shared'

/**
 * 审批实例
 * 每次发起审批都会创建一条实例记录，关联流程定义和具体业务单据
 */
@Entity('approval_instances')
export class ApprovalInstance extends BaseEntity {
  /** 关联的流程定义 ID */
  @Column({ name: 'flow_definition_id', type: 'int' })
  flowDefinitionId!: number

  /** 业务类型 */
  @Column({
    name: 'biz_type',
    type: 'enum',
    enum: ApprovalBizType,
  })
  bizType!: ApprovalBizType

  /** 业务记录 ID（如报价单 ID、合同 ID） */
  @Column({ name: 'biz_id', type: 'int' })
  bizId!: number

  /** 业务单号（可读编号，如 QT-2024-001） */
  @Column({ name: 'biz_no', type: 'varchar', length: 50, nullable: true })
  bizNo!: string | null

  /** 审批标题 */
  @Column({ type: 'varchar', length: 200 })
  title!: string

  /** 申请人 ID */
  @Column({ name: 'applicant_id', type: 'int' })
  applicantId!: number

  /** 当前待审批节点 ID（与流程定义 nodes[].id 对应） */
  @Column({ name: 'current_node_id', type: 'varchar', length: 50, nullable: true })
  currentNodeId!: string | null

  /** 审批状态 */
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status!: ApprovalStatus

  /** 审批结论备注（驳回原因或最终审批意见摘要） */
  @Column({ name: 'result_remark', type: 'text', nullable: true })
  resultRemark!: string | null

  /** 审批完成时间 */
  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null
}
