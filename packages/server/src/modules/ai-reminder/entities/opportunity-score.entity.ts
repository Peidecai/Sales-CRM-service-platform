import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export interface ScoreDimensions {
  customerFit: number
  engagementLevel: number
  stageProgress: number
  sentimentTrend: number
  competitorRisk: number
}

@Entity('opportunity_scores')
export class OpportunityScore extends BaseEntity {
  @Index()
  @Column({ name: 'opportunity_id', type: 'int' })
  opportunityId!: number

  @Column({ type: 'int', comment: 'Overall score 0-100' })
  score!: number

  @Column({ type: 'json', comment: 'Multi-dimension scoring breakdown' })
  dimensions!: ScoreDimensions

  @Column({ name: 'ai_reasoning', type: 'text', nullable: true })
  aiReasoning!: string | null

  @Column({ name: 'scored_at', type: 'datetime' })
  scoredAt!: Date
}
