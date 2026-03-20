import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { User } from '../../user/user.entity'
import { Customer } from '../../customer/customer.entity'

export enum CheckInStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('check_ins')
export class CheckIn extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number

  @Column({ type: 'int', comment: 'GPS 精度（米）' })
  accuracy!: number

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl!: string | null

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @Column({ name: 'check_in_time', type: 'datetime' })
  checkInTime!: Date

  @Column({ type: 'int', nullable: true, comment: '与客户地址距离（米）' })
  distance!: number | null

  @Column({
    type: 'enum',
    enum: CheckInStatus,
    default: CheckInStatus.PENDING,
  })
  status!: CheckInStatus

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null
}
