import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

@Entity('customer_tag_relations')
@Index('IDX_TAG_REL_UNIQUE', ['customerId', 'tagId'], { unique: true })
export class CustomerTagRelation {
  @PrimaryGeneratedColumn()
  id!: number

  @Index()
  @Column({ name: 'customer_id', comment: '客户ID' })
  customerId!: number

  @Index()
  @Column({ name: 'tag_id', comment: '标签ID' })
  tagId!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
