import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { Customer } from '../customer/customer.entity'
import { User } from '../user/user.entity'

export enum FollowUpType {
  CALL = 'call',
  VISIT = 'visit',
  EMAIL = 'email',
  WECHAT = 'wechat',
  OTHER = 'other',
}

@Entity('follow_ups')
export class FollowUp extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id' })
  customerId!: number

  @Index()
  @Column({ name: 'user_id' })
  userId!: number

  @Column({ type: 'enum', enum: FollowUpType, default: FollowUpType.CALL })
  type!: FollowUpType

  @Column({ type: 'text' })
  content!: string

  @Column({ name: 'next_follow_up_date', type: 'date', nullable: true })
  nextFollowUpDate?: Date

  @Column({ name: 'next_follow_up_note', length: 500, nullable: true })
  nextFollowUpNote?: string

  @Index()
  @Column({ name: 'contact_id', nullable: true, comment: '关联联系人ID' })
  contactId!: number

  @Column({ length: 500, nullable: true, comment: '跟进结果' })
  result!: string

  @Column({ name: 'next_plan', length: 500, nullable: true, comment: '下次计划' })
  nextPlan!: string

  @Column({ name: 'intention_level', type: 'tinyint', nullable: true, comment: '意向等级(1-5)' })
  intentionLevel!: number

  @Column({ type: 'json', nullable: true, comment: '附件列表' })
  attachments!: Array<{ name: string; url: string; type: string }> | null

  @Column({ length: 200, nullable: true, comment: '跟进地点' })
  location!: string

  @Column({ nullable: true, comment: '时长(分钟)' })
  duration!: number

  @Column({ name: 'call_recording_url', length: 500, nullable: true, comment: '录音URL' })
  callRecordingUrl!: string

  @Index()
  @Column({ name: 'related_opportunity_id', nullable: true, comment: '关联商机ID' })
  relatedOpportunityId!: number

  @ManyToOne(() => Customer, { lazy: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'user_id' })
  user?: User
}
