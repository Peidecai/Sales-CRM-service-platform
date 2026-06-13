import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { EncryptionService } from '../../common/security/encryption.service'
import { Customer } from '../customer/customer.entity'

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum DecisionRole {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  USER = 'user',
  GATEKEEPER = 'gatekeeper',
}

@Entity('contacts')
export class Contact extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id', comment: '关联客户ID' })
  customerId!: number

  @Column({ length: 50, comment: '联系人姓名' })
  name!: string

  @Column({ type: 'enum', enum: Gender, default: Gender.UNKNOWN, comment: '性别' })
  gender!: Gender

  @Index()
  @Column({
    length: 255,
    nullable: true,
    comment: '手机号',
    transformer: EncryptionService.columnTransformer(),
  })
  mobile!: string

  @Column({ length: 20, nullable: true, comment: '座机' })
  landline!: string

  @Index()
  @Column({
    length: 255,
    nullable: true,
    comment: '邮箱',
    transformer: EncryptionService.columnTransformer(),
  })
  email!: string

  @Column({ length: 50, nullable: true, comment: '微信号' })
  wechat!: string

  @Column({ length: 100, nullable: true, comment: '部门' })
  department!: string

  @Column({ length: 100, nullable: true, comment: '职位' })
  position!: string

  @Column({
    name: 'decision_role',
    type: 'enum',
    enum: DecisionRole,
    nullable: true,
    comment: '决策角色',
  })
  decisionRole!: DecisionRole

  @Column({ name: 'influence_level', type: 'tinyint', nullable: true, comment: '影响力(1-5)' })
  influenceLevel!: number

  @Column({ name: 'is_primary', default: false, comment: '是否主联系人' })
  isPrimary!: boolean

  @Column({ type: 'date', nullable: true, comment: '生日' })
  birthday!: Date

  @Column({ length: 200, nullable: true, comment: '爱好' })
  hobby!: string

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark!: string

  @ManyToOne(() => Customer, { lazy: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer
}
