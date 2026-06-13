import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { SpeechTemplateStatus } from '@crm/shared'
import { SpeechCategory } from './speech-category.entity'
import { SpeechAnnotation } from './speech-annotation.entity'

@Entity('speech_templates')
export class SpeechTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ name: 'category_id', type: 'int' })
  categoryId!: number

  @ManyToOne(() => SpeechCategory, (c) => c.templates)
  @JoinColumn({ name: 'category_id' })
  category!: SpeechCategory

  @Column({ type: 'varchar', length: 200, nullable: true })
  scene!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  tags!: string | null

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount!: number

  @Column({
    type: 'varchar',
    length: 20,
    default: SpeechTemplateStatus.DRAFT,
  })
  status!: string

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number

  @OneToMany(() => SpeechAnnotation, (a) => a.template)
  annotations!: SpeechAnnotation[]
}
