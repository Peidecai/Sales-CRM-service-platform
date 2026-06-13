import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'
import { AiPromptTemplate } from './ai-prompt-template.entity'

@Entity('ai_prompt_histories')
export class AiPromptHistory extends BaseEntity {
  @Column({ type: 'int', comment: '模板ID' })
  templateId!: number

  @ManyToOne(() => AiPromptTemplate, (t) => t.histories)
  @JoinColumn({ name: 'templateId' })
  template!: AiPromptTemplate

  @Column({ type: 'int', comment: '版本号' })
  version!: number

  @Column({ type: 'text', comment: '系统提示词' })
  systemPrompt!: string

  @Column({ type: 'text', nullable: true, comment: '用户提示词模板' })
  userPromptTemplate!: string | null

  @Column({ type: 'text', nullable: true, comment: '变更说明' })
  changeNote!: string | null

  @Column({ type: 'int', comment: '修改人ID' })
  changedById!: number
}
