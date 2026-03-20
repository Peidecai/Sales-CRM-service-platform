import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import type { Product } from './product.entity'

@Entity('product_categories')
export class ProductCategory extends BaseEntity {
  @Column({ length: 100 })
  name!: string

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId!: number | null

  @ManyToOne(() => ProductCategory, (c) => c.children, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'parent_id' })
  parent!: ProductCategory | null

  @OneToMany(() => ProductCategory, (c) => c.parent)
  children!: ProductCategory[]

  @OneToMany('Product', 'category')
  products!: Product[]

  @Column({ type: 'int', default: 0 })
  sort!: number
}
