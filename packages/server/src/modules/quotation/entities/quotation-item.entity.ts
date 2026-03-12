import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm'

@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'quotation_id', comment: '报价单ID' })
  quotationId!: number

  @Column({ name: 'product_name', length: 200, comment: '产品名称' })
  productName!: string

  @Column({ name: 'product_spec', length: 500, nullable: true, comment: '产品规格' })
  productSpec!: string | null

  @Column({ length: 20, nullable: true, comment: '单位' })
  unit!: string | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1, comment: '数量' })
  quantity!: number

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, comment: '单价' })
  unitPrice!: number

  @Column({
    name: 'list_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: '标准价',
  })
  listPrice!: number

  @Column({
    name: 'discount_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: '行项折扣率(%)',
  })
  discountRate!: number

  @Column({ name: 'line_amount', type: 'decimal', precision: 15, scale: 2, comment: '行金额' })
  lineAmount!: number

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder!: number

  @Column({ length: 500, nullable: true, comment: '行备注' })
  remark!: string | null

  @ManyToOne('Quotation', 'items', { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'quotation_id' })
  quotation!: unknown
}
