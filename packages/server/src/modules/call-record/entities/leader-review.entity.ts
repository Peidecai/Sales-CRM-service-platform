import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('leader_reviews')
export class LeaderReview extends BaseEntity {
  @Index()
  @Column({ name: 'call_record_id', type: 'int' })
  callRecordId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null

  @Column({ name: 'reviewer_id', type: 'int' })
  reviewerId!: number

  @Column({ type: 'text' })
  content!: string
}
