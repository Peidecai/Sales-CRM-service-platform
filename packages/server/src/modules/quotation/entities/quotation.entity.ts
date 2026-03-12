import { Entity, Column, Index, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { QuotationStatus } from '@crm/shared'

@Entity('quotations')
export class Quotation extends BaseEntity {
  @Column({ name: 'quotation_no', length: 32, unique: true, comment: '报价编号 QUO-YYYYMMDD-XXXX' })
  quotationNo!: string

  @Column({ length: 200, comment: '报价单名称' })
  title!: string

  @Index()
  @Column({ name: 'opportunity_id', comment: '关联商机ID' })
  opportunityId!: number

  @Index()
  @Column({ name: 'customer_id', comment: '客户ID' })
  customerId!: number

  @Column({ name: 'contact_id', type: 'int', nullable: true, comment: '联系人ID' })
  contactId!: number | null

  @Column({ name: 'owner_id', comment: '负责人ID' })
  ownerId!: number

  @Column({ type: 'int', default: 1, comment: '版本号' })
  version!: number

  @Column({ length: 3, default: 'CNY', comment: '币种' })
  currency!: string

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, comment: '小计金额（折前）' })
  subtotal!: number

  @Column({ name: 'discount_type', length: 10, nullable: true, comment: '折扣类型: PERCENT/FIXED' })
  discountType!: string | null

  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '折扣值',
  })
  discountValue!: number

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: '折扣金额',
  })
  discountAmount!: number

  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: '税率(%)',
  })
  taxRate!: number

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: '税额',
  })
  taxAmount!: number

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: '总金额（含税）',
  })
  totalAmount!: number

  @Column({ name: 'valid_until', type: 'date', comment: '报价有效期' })
  validUntil!: Date

  @Column({ name: 'payment_terms', length: 500, nullable: true, comment: '付款条款' })
  paymentTerms!: string | null

  @Column({ name: 'delivery_terms', length: 500, nullable: true, comment: '交付条款' })
  deliveryTerms!: string | null

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark!: string | null

  @Column({
    type: 'enum',
    enum: QuotationStatus,
    default: QuotationStatus.DRAFT,
    comment: '报价状态',
  })
  status!: QuotationStatus

  @Column({ name: 'sent_at', type: 'datetime', nullable: true, comment: '发送给客户时间' })
  sentAt!: Date | null

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true, comment: '客户接受时间' })
  acceptedAt!: Date | null

  @Column({ type: 'json', nullable: true, comment: '附件列表' })
  attachments!: Record<string, unknown>[] | null

  @Column({ name: 'created_by', comment: '创建人ID' })
  createdBy!: number

  @OneToMany('QuotationItem', 'quotation')
  items!: QuotationItem[]
}

import { QuotationItem } from './quotation-item.entity'
