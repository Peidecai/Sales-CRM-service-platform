import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
}

@Entity('customer_field_definitions')
export class CustomFieldDefinition extends BaseEntity {
  @Column({ name: 'field_key', length: 50, unique: true, comment: '字段标识' })
  fieldKey!: string

  @Column({ name: 'field_label', length: 100, comment: '字段显示名' })
  fieldLabel!: string

  @Column({ name: 'field_type', type: 'enum', enum: FieldType, comment: '字段类型' })
  fieldType!: FieldType

  @Column({ type: 'json', nullable: true, comment: '选项配置' })
  options!: string[] | null

  @Column({ default: false, comment: '是否必填' })
  required!: boolean

  @Column({ name: 'default_value', length: 500, nullable: true, comment: '默认值' })
  defaultValue!: string

  @Column({ default: 0, comment: '排序' })
  sort!: number

  @Column({ name: 'is_active', default: true, comment: '是否启用' })
  isActive!: boolean
}
