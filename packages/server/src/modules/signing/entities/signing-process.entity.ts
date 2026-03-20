import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { Opportunity } from '../../opportunity/opportunity.entity'
import { Contract } from '../../contract/entities/contract.entity'

@Entity('signing_processes')
export class SigningProcess extends BaseEntity {
  @Index()
  @Column({ name: 'opportunity_id', type: 'int' })
  opportunityId!: number

  @ManyToOne(() => Opportunity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity!: Opportunity

  @Column({ name: 'contract_id', type: 'int', nullable: true })
  contractId!: number | null

  @ManyToOne(() => Contract, { createForeignKeyConstraints: false, nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract | null

  @Index()
  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status!: string

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt!: Date | null

  @Column({ name: 'signed_at', type: 'datetime', nullable: true })
  signedAt!: Date | null

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null

  @Column({ name: 'external_sign_id', type: 'varchar', length: 500, nullable: true })
  externalSignId!: string | null

  @Index()
  @Column({ name: 'sales_user_id', type: 'int' })
  salesUserId!: number
}
