import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ApprovalBizType } from '@crm/shared'

/**
 * 审批流程定义
 * 定义某种业务类型的审批节点结构和触发条件
 */
@Entity('approval_flows')
export class ApprovalFlow extends BaseEntity {
  /** 流程编码，全局唯一 */
  @Column({ name: 'flow_code', type: 'varchar', length: 50, unique: true })
  flowCode!: string

  /** 流程名称 */
  @Column({ name: 'flow_name', type: 'varchar', length: 100 })
  flowName!: string

  /** 适用业务类型 */
  @Column({
    name: 'biz_type',
    type: 'enum',
    enum: ApprovalBizType,
  })
  bizType!: ApprovalBizType

  /** 流程说明 */
  @Column({ type: 'text', nullable: true })
  description!: string | null

  /**
   * 触发条件规则（JSON）
   * 示例：{ "amount": { "gt": 10000 } }
   */
  @Column({ name: 'condition_rules', type: 'json', nullable: true })
  conditionRules!: Record<string, unknown> | null

  /**
   * 审批节点配置（JSON）
   * 示例：[{ id:"node1", name:"部门主管审批", approverType:"role", approverValue:"manager", order:1 }]
   */
  @Column({ type: 'json' })
  nodes!: Array<{
    id: string
    name: string
    approverType: 'user' | 'role' | 'department_head'
    approverValue: string
    order: number
  }>

  /** 是否启用 */
  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean

  /** 版本号（变更时递增，避免历史实例数据混淆） */
  @Column({ type: 'int', default: 1 })
  version!: number

  /** 创建人 ID */
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number | null
}
