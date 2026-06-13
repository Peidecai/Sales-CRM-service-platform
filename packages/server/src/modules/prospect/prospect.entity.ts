import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { EncryptionService } from '../../common/security/encryption.service'
import { ProspectChannel, ProspectStatus } from '@crm/shared'

@Entity('prospects')
export class Prospect extends BaseEntity {
  @Index()
  @Column({ name: 'company_name', type: 'varchar', length: 200, comment: '企业名称' })
  companyName!: string

  @Column({
    name: 'legal_person',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '法人代表',
  })
  legalPerson!: string | null

  @Column({
    name: 'registered_capital',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '注册资本',
  })
  registeredCapital!: string | null

  @Column({
    name: 'establish_date',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '成立日期',
  })
  establishDate!: string | null

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true, comment: '行业' })
  industry!: string | null

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true, comment: '省份' })
  province!: string | null

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '城市' })
  city!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '详细地址' })
  address!: string | null

  @Index()
  @Column({
    name: 'unified_credit_code',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '统一社会信用代码',
  })
  unifiedCreditCode!: string | null

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '联系电话',
    transformer: EncryptionService.columnTransformer(),
  })
  phone!: string | null

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '邮箱',
    transformer: EncryptionService.columnTransformer(),
  })
  email!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '公司网站' })
  website!: string | null

  @Column({ name: 'employee_count', type: 'int', nullable: true, comment: '员工人数' })
  employeeCount!: number | null

  @Column({ name: 'business_scope', type: 'text', nullable: true, comment: '经营范围' })
  businessScope!: string | null

  @Index()
  @Column({ type: 'enum', enum: ProspectChannel, comment: '数据来源渠道' })
  channel!: ProspectChannel

  @Index()
  @Column({
    type: 'enum',
    enum: ProspectStatus,
    default: ProspectStatus.NEW,
    comment: '线索状态',
  })
  status!: ProspectStatus

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark!: string | null

  @Index()
  @Column({ name: 'assigned_user_id', type: 'int', nullable: true, comment: '分配给的销售ID' })
  assignedUserId!: number | null

  @Column({ name: 'converted_customer_id', type: 'int', nullable: true, comment: '转化后的客户ID' })
  convertedCustomerId!: number | null

  @Column({ name: 'converted_at', type: 'datetime', nullable: true, comment: '转化时间' })
  convertedAt!: Date | null

  @Index()
  @Column({
    name: 'search_batch_id',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '搜索批次ID',
  })
  searchBatchId!: string | null
}
