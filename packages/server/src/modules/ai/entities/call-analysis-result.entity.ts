import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { AnalysisType, AnalysisInputSource, AnalysisStatus } from '@crm/shared'

/**
 * 通话 AI 分析结果
 * 每次分析产生一条记录，支持多次重新分析
 */
@Entity('call_analysis_results')
export class CallAnalysisResult extends BaseEntity {
  // ---- 关联 ----

  @Index()
  @Column({ name: 'call_record_id', type: 'int' })
  callRecordId!: number

  @Index()
  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId!: number | null

  // ---- 分析元信息 ----

  /** 分析类型: full=全量, classify_only=仅分类, speech_only=仅评分 */
  @Column({
    name: 'analysis_type',
    type: 'varchar',
    length: 20,
    default: 'full',
  })
  analysisType!: AnalysisType

  /** 输入来源: asr=转写文本, notes=通话备注, both=两者合并 */
  @Column({
    name: 'input_source',
    type: 'varchar',
    length: 20,
    default: 'both',
  })
  inputSource!: AnalysisInputSource

  // ---- 客户分类结果 ----

  @Column({ name: 'customer_classify', type: 'varchar', length: 100, nullable: true })
  customerClassify!: string | null

  /** 分类置信度 0–1 */
  @Column({
    name: 'classify_confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  classifyConfidence!: number | null

  /** 建议的客户状态值（对应 CustomerStatus 枚举，存 varchar） */
  @Column({ name: 'suggested_status', type: 'varchar', length: 50, nullable: true })
  suggestedStatus!: string | null

  @Column({ name: 'suggested_tags', type: 'json', nullable: true })
  suggestedTags!: string[] | null

  // ---- 话术评分结果 ----

  /** 话术评分 0–100 */
  @Column({ name: 'speech_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  speechScore!: number | null

  @Column({ name: 'speech_feedback', type: 'text', nullable: true })
  speechFeedback!: string | null

  // ---- 知识库匹配结果 ----

  /** 知识库命中率 0–1 */
  @Column({
    name: 'knowledge_match_rate',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  knowledgeMatchRate!: number | null

  /** 未覆盖到的知识点列表 */
  @Column({ name: 'knowledge_gaps', type: 'json', nullable: true })
  knowledgeGaps!: string[] | null

  // ---- 综合摘要 ----

  @Column({ type: 'text', nullable: true })
  summary!: string | null

  /** AI 原始响应（调试用） */
  @Column({ name: 'raw_ai_response', type: 'text', nullable: true })
  rawAiResponse!: string | null

  // ---- 转化结果 ----

  @Column({ name: 'opportunity_created', type: 'boolean', default: false })
  opportunityCreated!: boolean

  @Column({ name: 'opportunity_id', type: 'int', nullable: true })
  opportunityId!: number | null

  /** 结果被采纳的时间 */
  @Column({ name: 'applied_at', type: 'datetime', precision: 6, nullable: true })
  appliedAt!: Date | null

  /** 销售人员手动备注（采纳/驳回理由等） */
  @Column({ name: 'manual_note', type: 'text', nullable: true })
  manualNote!: string | null

  // ---- 状态 ----

  /** pending=排队中, completed=已完成, failed=分析失败, applied=已采纳 */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: AnalysisStatus

  /** 置信度说明，voice_memo 场景标注"基于销售描述，置信度较低" */
  @Column({ name: 'confidence_note', type: 'varchar', length: 200, nullable: true })
  confidenceNote!: string | null
}
