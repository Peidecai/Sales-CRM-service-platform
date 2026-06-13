import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { ProspectChannel } from '@crm/shared'
import { EncryptionService } from '../../../common/security/encryption.service'

@Entity('prospect_data_sources')
export class ProspectDataSource extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  name!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  channel!: ProspectChannel

  @Column({
    type: 'varchar',
    length: 500,
    transformer: EncryptionService.columnTransformer(),
  })
  apiKey!: string

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    transformer: EncryptionService.columnTransformer(),
  })
  apiSecret!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  apiEndpoint!: string | null

  @Column({ type: 'boolean', default: false })
  isEnabled!: boolean

  @Column({ type: 'int', default: 0 })
  dailyQuota!: number

  @Column({ type: 'int', default: 0 })
  usedToday!: number

  @Column({ type: 'int', default: 0 })
  totalUsed!: number

  @Column({ type: 'timestamp', nullable: true })
  lastCalledAt!: Date | null

  @Column({ type: 'json', nullable: true })
  config!: Record<string, unknown> | null

  @Column({ type: 'text', nullable: true })
  remark!: string | null
}
