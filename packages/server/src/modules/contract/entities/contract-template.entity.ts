import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export interface TemplateVariable {
  name: string
  label: string
  type: string
  required: boolean
}

@Entity('contract_templates')
export class ContractTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name!: string

  @Column({ type: 'longtext' })
  content!: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null

  @Column({ type: 'simple-json', nullable: true })
  variables!: TemplateVariable[] | null

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number
}
