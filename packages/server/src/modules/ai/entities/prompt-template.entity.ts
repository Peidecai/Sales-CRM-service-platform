import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('prompt_templates')
export class PromptTemplate {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'feature_key', type: 'varchar', length: 80 })
  featureKey!: string

  @Column({ type: 'varchar', length: 20, default: 'v1' })
  version!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @Column({ name: 'is_ab_test', type: 'boolean', default: false })
  isAbTest!: boolean

  @Column({ name: 'ab_ratio', type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  abRatio!: number

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId!: number | null

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date

  @Column({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date
}
