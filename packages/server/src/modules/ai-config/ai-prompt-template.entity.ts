import { Entity, Column, OneToMany } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { AiPromptHistory } from './ai-prompt-history.entity'

@Entity('ai_prompt_templates')
export class AiPromptTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 100, comment: '模板名称' })
  name!: string

  @Column({ type: 'varchar', length: 50, comment: '所属模块' })
  module!: string

  @Column({ type: 'varchar', length: 50, comment: '场景标识' })
  scene!: string

  @Column({ type: 'text', comment: '系统提示词' })
  systemPrompt!: string

  @Column({ type: 'text', nullable: true, comment: '用户提示词模板' })
  userPromptTemplate!: string | null

  @Column({ type: 'int', default: 1, comment: '版本号' })
  version!: number

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive!: boolean

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description!: string | null

  @Column({ type: 'int', comment: '创建人ID' })
  createdById!: number

  @OneToMany(() => AiPromptHistory, (h) => h.template)
  histories!: AiPromptHistory[]
}
