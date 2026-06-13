import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ProductStatus } from '@crm/shared'
import { ProductCategory } from './product-category.entity'

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 200 })
  name!: string

  @Index('IDX_product_code')
  @Column({ length: 50, unique: true })
  code!: string

  @Index('IDX_product_category')
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null

  @ManyToOne(() => ProductCategory, (c) => c.products, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategory | null

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number

  @Column({ length: 20 })
  unit!: string

  @Index('IDX_product_status')
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status!: ProductStatus

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'json', nullable: true })
  specs!: Record<string, unknown> | null
}
