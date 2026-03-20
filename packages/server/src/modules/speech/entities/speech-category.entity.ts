import { Entity, Column, OneToMany } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { SpeechTemplate } from './speech-template.entity'

@Entity('speech_categories')
export class SpeechCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string

  @Column({ type: 'int', default: 0 })
  sort!: number

  @OneToMany(() => SpeechTemplate, (t) => t.category)
  templates!: SpeechTemplate[]
}
