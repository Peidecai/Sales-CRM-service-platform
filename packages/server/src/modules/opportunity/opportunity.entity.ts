import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { OpportunityStage, OpportunityStatus, Priority } from '@crm/shared'
import { Customer } from '../customer/customer.entity'
import type { CallRecord } from '../call-record/call-record.entity'

@Entity('opportunities')
export class Opportunity extends BaseEntity {
  @Column({ length: 200 })
  title!: string

  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  // ---- Relations ----

  @ManyToOne(() => Customer, (c) => c.opportunities, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer

  @OneToMany('CallRecord', 'opportunity')
  callRecords!: CallRecord[]

  @Column({ type: 'enum', enum: OpportunityStage, default: OpportunityStage.LEAD })
  stage!: OpportunityStage

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount!: number

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate!: Date

  @Column({ type: 'int', default: 10, comment: 'Win probability 0-100' })
  probability!: number

  @Index()
  @Column({ name: 'assigned_user_id' })
  assignedUserId!: number

  @Column({ type: 'text', nullable: true })
  description!: string

  // ---- 扩展字段 ----

  @Column({
    name: 'opportunity_no',
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
    comment: '商机编号',
  })
  opportunityNo!: string | null

  @Index()
  @Column({ name: 'contact_id', type: 'int', nullable: true, comment: '关联联系人ID' })
  contactId!: number | null

  @Column({ name: 'team_id', type: 'int', nullable: true, comment: '团队ID' })
  teamId!: number | null

  @Column({ name: 'source', type: 'varchar', length: 50, nullable: true, comment: '商机来源' })
  source!: string | null

  @Column({ name: 'lead_id', type: 'int', nullable: true, comment: '线索ID' })
  leadId!: number | null

  @Column({
    name: 'weighted_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: '加权金额',
  })
  weightedAmount!: number

  @Column({ name: 'currency', length: 10, default: 'CNY', comment: '币种' })
  currency!: string

  @Column({ name: 'actual_close_date', type: 'date', nullable: true, comment: '实际成交日期' })
  actualCloseDate!: Date | null

  @Column({
    name: 'close_reason',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '关闭原因',
  })
  closeReason!: string | null

  @Column({ name: 'close_remark', type: 'text', nullable: true, comment: '关闭备注' })
  closeRemark!: string | null

  @Column({ name: 'competitor_ids', type: 'json', nullable: true, comment: '竞品ID列表' })
  competitorIds!: number[] | null

  @Column({ name: 'product_ids', type: 'json', nullable: true, comment: '产品ID列表' })
  productIds!: number[] | null

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
    comment: '优先级',
  })
  priority!: Priority

  @Column({
    name: 'ai_win_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'AI预测赢率',
  })
  aiWinRate!: number | null

  @Column({ name: 'ai_suggestion', type: 'text', nullable: true, comment: 'AI建议' })
  aiSuggestion!: string | null

  @Column({ name: 'custom_fields', type: 'json', nullable: true, comment: '自定义字段' })
  customFields!: Record<string, unknown> | null

  @Column({
    type: 'enum',
    enum: OpportunityStatus,
    default: OpportunityStatus.ACTIVE,
    comment: '商机状态',
  })
  status!: OpportunityStatus
}
