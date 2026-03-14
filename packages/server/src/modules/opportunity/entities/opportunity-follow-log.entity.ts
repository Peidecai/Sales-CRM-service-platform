import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export enum OpportunityFollowType {
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  WECHAT = 'wechat',
  MEETING = 'meeting',
  DEMO = 'demo',
  OTHER = 'other',
}

@Entity('opportunity_follow_logs')
export class OpportunityFollowLog extends BaseEntity {
  @Index()
  @Column({ name: 'opportunity_id', type: 'int', comment: '商机ID' })
  opportunityId!: number

  @Index()
  @Column({ name: 'user_id', type: 'int', comment: '操作人ID' })
  userId!: number

  @Column({
    type: 'enum',
    enum: OpportunityFollowType,
    comment: '跟进类型',
  })
  type!: OpportunityFollowType

  @Column({ type: 'text', comment: '跟进内容' })
  content!: string

  @Column({ type: 'varchar', name: 'result', length: 500, nullable: true, comment: '跟进结果' })
  result!: string | null

  @Column({
    type: 'varchar',
    name: 'next_step',
    length: 500,
    nullable: true,
    comment: '下一步计划',
  })
  nextStep!: string | null

  @Column({ type: 'json', nullable: true, comment: '附件列表' })
  attachments!: Array<{ name: string; url: string; type?: string }> | null
}
