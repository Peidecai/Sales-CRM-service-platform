import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm'

/**
 * 单行配置表 (id = 1, 无自增)
 * AI 分析功能总开关 + 模型选择 + 自定义提示词
 */
@Entity('ai_analysis_configs')
export class AiAnalysisConfig {
  /** 固定主键 id = 1，不自增 */
  @PrimaryColumn({ type: 'int' })
  id!: number

  // ---- 功能开关 ----

  @Column({ name: 'call_analysis_enabled', type: 'boolean', default: true })
  callAnalysisEnabled!: boolean

  @Column({ name: 'customer_classify_enabled', type: 'boolean', default: true })
  customerClassifyEnabled!: boolean

  @Column({ name: 'speech_scoring_enabled', type: 'boolean', default: true })
  speechScoringEnabled!: boolean

  @Column({ name: 'knowledge_compare_enabled', type: 'boolean', default: true })
  knowledgeCompareEnabled!: boolean

  @Column({ name: 'auto_create_opportunity', type: 'boolean', default: true })
  autoCreateOpportunity!: boolean

  // ---- 模型配置 ----

  @Column({ name: 'chat_model', type: 'varchar', length: 100, default: 'qwen-plus' })
  chatModel!: string

  @Column({ name: 'embedding_model', type: 'varchar', length: 100, default: 'text-embedding-v3' })
  embeddingModel!: string

  // ---- 自定义提示词 ----

  @Column({ name: 'call_analysis_prompt', type: 'text', nullable: true })
  callAnalysisPrompt!: string | null

  @Column({ name: 'customer_classify_prompt', type: 'text', nullable: true })
  customerClassifyPrompt!: string | null

  @Column({ name: 'speech_scoring_prompt', type: 'text', nullable: true })
  speechScoringPrompt!: string | null

  @Column({ name: 'voice_memo_prompt', type: 'text', nullable: true })
  voiceMemoPrompt!: string | null

  // ---- 分类规则 ----

  /** 客户分类规则数组，每项描述一个分类及其判定条件 */
  @Column({ name: 'classify_rules', type: 'json', nullable: true })
  classifyRules!: Record<string, unknown>[] | null

  // ---- 审计字段 ----

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy!: number | null

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
