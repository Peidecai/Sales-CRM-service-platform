import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ServiceType, ServiceStatus, ServicePriority } from '@crm/shared'
import { Customer } from '../../customer/customer.entity'

@Entity('service_records')
export class ServiceRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'text' })
  description!: string

  @Column({ type: 'enum', enum: ServiceType })
  type!: ServiceType

  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.PENDING })
  status!: ServiceStatus

  @Column({ type: 'enum', enum: ServicePriority, default: ServicePriority.MEDIUM })
  priority!: ServicePriority

  @Index()
  @Column({ name: 'customer_id', type: 'int' })
  customerId!: number

  @Column({ name: 'contract_id', type: 'int', nullable: true })
  contractId!: number | null

  @Index()
  @Column({ name: 'assignee_id', type: 'int', nullable: true })
  assigneeId!: number | null

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number

  @Column({ type: 'text', nullable: true })
  resolution!: string | null

  @Column({ name: 'satisfaction_score', type: 'int', nullable: true })
  satisfactionScore!: number | null

  @Column({ name: 'satisfaction_comment', type: 'varchar', length: 500, nullable: true })
  satisfactionComment!: string | null

  @Column({ name: 'sla_response_deadline', type: 'datetime', nullable: true })
  slaResponseDeadline!: Date | null

  @Column({ name: 'sla_resolve_deadline', type: 'datetime', nullable: true })
  slaResolveDeadline!: Date | null

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt!: Date | null

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt!: Date | null

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt!: Date | null

  @ManyToOne(() => Customer, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer
}
