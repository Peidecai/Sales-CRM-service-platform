import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ProspectSearchQuery } from '@crm/shared'

@Entity('prospect_search_templates')
export class ProspectSearchTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Index()
  @Column({ type: 'int' })
  userId!: number

  @Column({ type: 'json' })
  conditions!: ProspectSearchQuery

  @Column({ type: 'boolean', default: false })
  isShared!: boolean

  @Column({ type: 'int', default: 0 })
  sortOrder!: number
}
