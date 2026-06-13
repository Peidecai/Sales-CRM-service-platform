import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

@Entity('competitor_mentions')
export class CompetitorMention extends BaseEntity {
  @Index()
  @Column({ name: 'call_record_id', type: 'int' })
  callRecordId!: number

  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  @Column({ name: 'competitor_name', type: 'varchar', length: 200 })
  competitorName!: string

  @Column({ type: 'text', nullable: true })
  context!: string | null

  @Column({ type: 'varchar', length: 30 })
  sentiment!: string
}
