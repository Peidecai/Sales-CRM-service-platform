import { Entity, Column, Index, OneToMany } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { EncryptionService } from '../../common/security/encryption.service'
import {
  CustomerStatus,
  CustomerSource,
  CustomerType,
  CustomerScale,
  CustomerLevel,
  CreditRating,
} from '@crm/shared'
import type { Opportunity } from '../opportunity/opportunity.entity'
import type { CallRecord } from '../call-record/call-record.entity'

@Entity('customers')
export class Customer extends BaseEntity {
  // ---- Relations (ORM only, no FK constraint) ----

  @OneToMany('Opportunity', 'customer')
  opportunities!: Opportunity[]

  @OneToMany('CallRecord', 'customer')
  callRecords!: CallRecord[]

  @OneToMany('Contact', 'customer')
  contacts!: import('../contact/contact.entity').Contact[]

  // ---- Core Columns ----

  @Column({ length: 100, comment: '客户名称' })
  name!: string

  @Column({ length: 200, nullable: true, comment: '公司名称' })
  company!: string

  @Column({
    length: 255,
    nullable: true,
    comment: '手机号',
    transformer: EncryptionService.columnTransformer(),
  })
  phone!: string

  @Column({
    length: 255,
    nullable: true,
    comment: '邮箱',
    transformer: EncryptionService.columnTransformer(),
  })
  email!: string

  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.LEAD, comment: '客户状态' })
  status!: CustomerStatus

  @Index()
  @Column({ name: 'assigned_user_id', comment: '负责人ID' })
  assignedUserId!: number

  @Column({ type: 'text', nullable: true, comment: '备注' })
  notes!: string

  @Column({ type: 'simple-array', nullable: true, comment: '标签' })
  tags!: string[]

  @Column({ length: 50, nullable: true, comment: '行业' })
  industry!: string

  @Column({ type: 'enum', enum: CustomerSource, nullable: true, comment: '客户来源' })
  source!: CustomerSource

  // ---- Expanded Fields ----

  @Column({ name: 'customer_no', length: 20, nullable: true, unique: true, comment: '客户编号' })
  customerNo!: string

  @Column({
    name: 'customer_type',
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.ENTERPRISE,
    comment: '客户类型',
  })
  customerType!: CustomerType

  @Column({ type: 'enum', enum: CustomerScale, nullable: true, comment: '企业规模' })
  scale!: CustomerScale

  @Index()
  @Column({ length: 100, nullable: true, comment: '所在区域' })
  region!: string

  @Index()
  @Column({ type: 'enum', enum: CustomerLevel, nullable: true, comment: '客户等级' })
  level!: CustomerLevel

  @Index()
  @Column({ name: 'intention_level', type: 'tinyint', nullable: true, comment: '意向等级(1-5)' })
  intentionLevel!: number

  @Column({
    name: 'credit_rating',
    type: 'enum',
    enum: CreditRating,
    nullable: true,
    comment: '信用评级',
  })
  creditRating!: CreditRating

  @Column({
    name: 'unified_credit_code',
    length: 18,
    nullable: true,
    unique: true,
    comment: '统一社会信用代码',
  })
  unifiedCreditCode!: string

  @Column({ name: 'legal_person', length: 50, nullable: true, comment: '法人代表' })
  legalPerson!: string

  @Column({
    name: 'registered_capital',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    comment: '注册资本(万元)',
  })
  registeredCapital!: number

  @Column({
    name: 'annual_revenue',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    comment: '年营收(万元)',
  })
  annualRevenue!: number

  @Column({ name: 'employee_count', nullable: true, comment: '员工人数' })
  employeeCount!: number

  // ---- Pool Fields ----

  @Index()
  @Column({ name: 'is_in_pool', default: false, comment: '是否在公海池' })
  isInPool!: boolean

  @Column({ name: 'pool_entered_at', type: 'datetime', nullable: true, comment: '进入公海池时间' })
  poolEnteredAt!: Date

  @Column({ name: 'protect_until', type: 'datetime', nullable: true, comment: '保护期截止时间' })
  protectUntil!: Date

  // ---- Extended Fields ----

  @Column({ name: 'custom_fields', type: 'json', nullable: true, comment: '自定义字段' })
  customFields!: Record<string, unknown>

  @Column({ length: 500, nullable: true, comment: '详细地址' })
  address!: string

  @Column({ length: 200, nullable: true, comment: '公司网站' })
  website!: string

  @Column({ type: 'text', nullable: true, comment: '客户描述' })
  description!: string
}
