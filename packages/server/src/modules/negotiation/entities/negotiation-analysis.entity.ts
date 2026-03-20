import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { NegotiationStatus } from '@crm/shared'

export interface NegotiationConcession {
  time: number
  type: string
  description: string
  impact: string
}

export interface NegotiationKeyMoment {
  time: number
  event: string
  analysis: string
}

@Entity('negotiation_analyses')
export class NegotiationAnalysis extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'call_record_id', type: 'int', comment: '关联通话记录ID' })
  callRecordId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int', nullable: true, comment: '关联客户ID' })
  customerId!: number | null

  @Index()
  @Column({ name: 'user_id', type: 'int', comment: '销售人员ID' })
  userId!: number

  @Index()
  @Column({
    type: 'enum',
    enum: NegotiationStatus,
    default: NegotiationStatus.PENDING,
    comment: '分析状态',
  })
  status!: NegotiationStatus

  @Column({
    name: 'overall_score',
    type: 'int',
    nullable: true,
    comment: '综合评分 1-100',
  })
  overallScore!: number | null

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '谈判策略',
  })
  strategy!: string | null

  @Column({
    type: 'json',
    nullable: true,
    comment: '让步记录',
  })
  concessions!: NegotiationConcession[] | null

  @Column({
    name: 'key_moments',
    type: 'json',
    nullable: true,
    comment: '关键时刻',
  })
  keyMoments!: NegotiationKeyMoment[] | null

  @Column({
    type: 'json',
    nullable: true,
    comment: '优势',
  })
  strengths!: string[] | null

  @Column({
    type: 'json',
    nullable: true,
    comment: '劣势',
  })
  weaknesses!: string[] | null

  @Column({
    name: 're_negotiation_advice',
    type: 'text',
    nullable: true,
    comment: '再谈判建议',
  })
  reNegotiationAdvice!: string | null

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '谈判结果',
  })
  outcome!: string | null

  @Column({
    type: 'text',
    nullable: true,
    comment: '分析摘要',
  })
  summary!: string | null

  @Column({
    name: 'raw_analysis',
    type: 'json',
    nullable: true,
    comment: 'AI 原始分析结果',
  })
  rawAnalysis!: Record<string, unknown> | null
}
