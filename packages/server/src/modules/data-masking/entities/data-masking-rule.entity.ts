import { Entity, Column, Unique, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'

export enum MaskType {
  PARTIAL = 'partial',
  FULL = 'full',
  HASH = 'hash',
}

@Entity('data_masking_rules')
@Unique(['entityName', 'fieldName'])
export class DataMaskingRule extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 50, name: 'entity_name' })
  entityName!: string

  @Column({ type: 'varchar', length: 50, name: 'field_name' })
  fieldName!: string

  @Column({ type: 'enum', enum: MaskType, name: 'mask_type' })
  maskType!: MaskType

  @Column({ type: 'varchar', length: 100, nullable: true })
  pattern!: string | null

  @Column({ type: 'json', nullable: true, name: 'exempt_roles' })
  exemptRoles!: string[] | null

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'exempt_permission' })
  exemptPermission!: string | null

  @Index()
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean
}
