import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity('opportunity_stage_logs')
export class OpportunityStageLog {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'opportunity_id', comment: '商机ID' })
  opportunityId!: number

  @Column({ name: 'from_stage', length: 30, comment: '原阶段' })
  fromStage!: string

  @Column({ name: 'to_stage', length: 30, comment: '目标阶段' })
  toStage!: string

  @Column({ name: 'from_probability', type: 'int', default: 0, comment: '原概率' })
  fromProbability!: number

  @Column({ name: 'to_probability', type: 'int', default: 0, comment: '目标概率' })
  toProbability!: number

  @Column({ name: 'stay_days', type: 'int', default: 0, comment: '在原阶段停留天数' })
  stayDays!: number

  @Column({ name: 'operator_id', type: 'int', comment: '操作人ID' })
  operatorId!: number

  @Column({ length: 500, nullable: true, comment: '备注' })
  remark!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
