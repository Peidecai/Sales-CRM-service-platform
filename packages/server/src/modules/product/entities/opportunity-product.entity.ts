import { Entity, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm'
import { PrimaryGeneratedColumn } from 'typeorm'
import { Opportunity } from '../../opportunity/opportunity.entity'
import { Product } from './product.entity'

@Entity('opportunity_products')
@Index('UQ_opp_product', ['opportunityId', 'productId'], { unique: true })
export class OpportunityProduct {
  @PrimaryGeneratedColumn()
  id!: number

  @Index('IDX_opp_product_opp')
  @Column({ name: 'opportunity_id' })
  opportunityId!: number

  @Column({ name: 'product_id' })
  productId!: number

  @ManyToOne(() => Opportunity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity!: Opportunity

  @ManyToOne(() => Product, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'product_id' })
  product!: Product

  @Column({ type: 'int', default: 1 })
  quantity!: number

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  discount!: number

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
