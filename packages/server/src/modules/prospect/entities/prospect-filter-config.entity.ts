import { Entity, Column, PrimaryColumn } from 'typeorm'

export interface CustomFilter {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'dateRange'
  options?: string[]
}

@Entity('prospect_filter_configs')
export class ProspectFilterConfig {
  @PrimaryColumn({ type: 'int' })
  id!: number

  @Column({ type: 'json' })
  enabledFilters!: string[]

  @Column({ type: 'json' })
  customFilters!: CustomFilter[]

  @Column({ type: 'int' })
  updatedBy!: number

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date
}
