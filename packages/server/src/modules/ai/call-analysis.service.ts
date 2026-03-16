import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallAnalysisResult } from './entities/call-analysis-result.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { CallTranscript } from '../recording/entities/call-transcript.entity'
import { RecordingFile } from '../recording/entities/recording-file.entity'
import { Customer } from '../customer/customer.entity'
import { AiService } from './ai.service'
import { AiAnalysisConfigService, type AnalysisJsonResult } from './ai-analysis-config.service'
import { CustomerService } from '../customer/customer.service'
import { OpportunityService } from '../opportunity/opportunity.service'
import { KnowledgeService } from '../knowledge/knowledge.service'
import { UpdateCustomerDto } from '../customer/dto/update-customer.dto'
import { ManualNoteDto } from './dto/manual-note.dto'
import { QueryAnalysisDto } from './dto/query-analysis.dto'
import {
  CustomerStatus,
  OpportunityStage,
  UserRole,
  RecordingSourceType,
  AnalysisInputSource,
  AnalysisStatus,
  AnalysisType,
} from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import type { AiAnalysisConfig } from './entities/ai-analysis-config.entity'

// ─── Local interface: classify rule shape ─────────────────────────────────────

/**
 * Mirrors the shape stored in `AiAnalysisConfig.classifyRules` (JSON column).
 * Fields must stay in sync with whatever the admin UI writes via
 * UpdateAnalysisConfigDto.classifyRules.
 */
interface ClassifyRule {
  /** AI-assigned label that this rule matches (e.g. "高意向") */
  label: string
  /** Target CustomerStatus value to set when this rule fires */
  customerStatus?: string
  /** Whether to create an Opportunity when this rule fires */
  createOpportunity?: boolean
  /** Extra tags to merge into customer.tags */
  suggestedTags?: string[]
}

// ─── Helper: build a synthetic admin AuthUser ─────────────────────────────────

/**
 * Constructs a minimal `AuthUser` with ADMIN role for passing to service
 * methods that require a user context (data-ownership checks are skipped
 * for admin, so this is safe for internal automation triggered by AI analysis).
 */
function makeAdminUser(userId: number): AuthUser {
  return { id: userId, username: 'ai-analysis', role: UserRole.ADMIN }
}

// ─── Internal interfaces ──────────────────────────────────────────────────────

interface KnowledgeGapResult {
  gaps: string[]
  matchRate: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CallAnalysisService {
  private readonly logger = new Logger(CallAnalysisService.name)

  constructor(
    @InjectRepository(CallAnalysisResult)
    private readonly analysisRepo: Repository<CallAnalysisResult>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    @InjectRepository(CallTranscript)
    private readonly transcriptRepo: Repository<CallTranscript>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(RecordingFile)
    private readonly recordingFileRepo: Repository<RecordingFile>,
    private readonly aiService: AiService,
    private readonly configService: AiAnalysisConfigService,
    private readonly customerService: CustomerService,
    private readonly opportunityService: OpportunityService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Full AI analysis pipeline for a single call record.
   *
   * Steps:
   * 1. Load config — if callAnalysisEnabled is false, throw immediately.
   * 2. Load the call record and build combined analysis text (transcript + notes).
   * 3. Create a `pending` result row.
   * 4. Run the main analysis LLM call (returns JSON with classify + summary + score).
   * 5. Optionally run dedicated speech-scoring prompt if score missing.
   * 6. Optionally run knowledge-gap analysis via KnowledgeService.ask().
   * 7. Persist all fields on the result row, set status = 'completed'.
   * 8. If customerClassifyEnabled and a customer is linked, apply classify rules:
   *    - update customer.status / tags via CustomerService.update()
   *    - if createOpportunity rule fires AND autoCreateOpportunity is on,
   *      create a new opportunity via OpportunityService.create()
   *    - set result.appliedAt / opportunityCreated / status = 'applied'
   * 9. Write result.summary back to callRecord.aiSummary for backward compat.
   * 10. Return the saved result.
   *
   * On any error in the LLM/application phase, status is set to 'failed'
   * and the error is logged without rethrowing.
   */
  async analyzeCall(callRecordId: number, user: AuthUser): Promise<CallAnalysisResult> {
    const config = await this.configService.getConfig()

    if (!config.callAnalysisEnabled) {
      throw new BadRequestException('AI 通话分析功能未启用')
    }

    // 1. Load call record
    const record = await this.callRecordRepo.findOne({ where: { id: callRecordId } })
    if (!record) throw new NotFoundException(`通话记录 #${callRecordId} 不存在`)

    // 2. Build combined text
    const { text, inputSource } = await this.buildAnalysisInput(record)
    if (!text) {
      throw new BadRequestException(
        `通话记录 #${callRecordId} 无可分析内容（无转写文本且无通话备注）`,
      )
    }

    // 3. Create pending result row
    const result = this.analysisRepo.create({
      callRecordId,
      customerId: record.customerId,
      analysisType: AnalysisType.FULL,
      inputSource,
      status: AnalysisStatus.PENDING,
    })
    await this.analysisRepo.save(result)

    try {
      // 4. Main LLM call — select prompt based on inputSource
      const mainPrompt =
        inputSource === AnalysisInputSource.VOICE_MEMO
          ? this.configService.resolveVoiceMemoPrompt(config)
          : this.configService.resolveCallAnalysisPrompt(config)
      const systemPromptWithText = mainPrompt.replace('{transcriptText}', text)

      const rawResponse = await this.aiService.chat(
        systemPromptWithText,
        '请按照要求分析上述通话记录并返回 JSON 结果。',
        { temperature: 0.3, maxTokens: 2048 },
      )
      result.rawAiResponse = rawResponse

      const parsed = this.parseAiJson(rawResponse)

      // 5. Supplemental speech-scoring call if score was absent from main response
      if (config.speechScoringEnabled && parsed.speechScore == null) {
        await this.runSpeechScoring(config, text, parsed)
      }

      // 6. Knowledge-gap analysis
      if (config.knowledgeCompareEnabled && text.length > 50) {
        await this.runKnowledgeGapAnalysis(text, result)
      }

      // 7. Write parsed fields to result
      this.applyParsedFieldsToResult(result, parsed)
      result.status = AnalysisStatus.COMPLETED

      // 7.1 Voice memo: annotate low confidence
      if (inputSource === AnalysisInputSource.VOICE_MEMO) {
        result.confidenceNote = '基于销售口述描述，话术评分和情感分析置信度较低'
      }

      // 9. Back-fill callRecord.aiSummary for backward compatibility
      if (parsed.summary) {
        record.aiSummary = parsed.summary
        await this.callRecordRepo.save(record)
      }

      await this.analysisRepo.save(result)

      // 8. Apply classify rules to customer (after persisting completed status)
      if (config.customerClassifyEnabled && result.customerClassify && record.customerId) {
        await this.applyClassifyRulesToCustomer(result, config, user)
      }
    } catch (error) {
      result.status = AnalysisStatus.FAILED
      this.logger.error(
        `Call analysis pipeline failed for record #${callRecordId}: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      await this.analysisRepo.save(result)
    }

    return result
  }

  /**
   * Returns the latest completed analysis result for a given call record.
   * Returns null if no completed analysis exists yet.
   */
  async getAnalysisResult(
    callRecordId: number,
    user?: AuthUser,
  ): Promise<CallAnalysisResult | null> {
    const qb = this.analysisRepo
      .createQueryBuilder('r')
      .where('r.callRecordId = :callRecordId', { callRecordId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [AnalysisStatus.COMPLETED, AnalysisStatus.APPLIED, AnalysisStatus.FAILED],
      })
      .orderBy('r.createdAt', 'DESC')

    // Data ownership: SALES users can only see results for their own call records
    if (user && user.role === UserRole.SALES) {
      qb.innerJoin('call_records', 'cr', 'cr.id = r.callRecordId').andWhere(
        'cr.user_id = :userId',
        { userId: user.id },
      )
    }

    return qb.getOne()
  }

  /**
   * Apply the analysis result — sets appliedAt timestamp and status = 'applied'.
   * When autoCreateOpportunity is enabled in config and no opportunity was
   * previously created, creates one via OpportunityService.
   *
   * Only 'completed' results can be applied; idempotently rejects 'applied' ones.
   */
  async applyAnalysisResult(resultId: number, user: AuthUser): Promise<CallAnalysisResult> {
    const result = await this.analysisRepo.findOne({ where: { id: resultId } })
    if (!result) throw new NotFoundException(`分析记录 #${resultId} 不存在`)

    if (result.status === AnalysisStatus.APPLIED) {
      throw new BadRequestException('该分析结果已被采纳')
    }
    if (result.status !== AnalysisStatus.COMPLETED) {
      throw new BadRequestException('只有状态为 completed 的分析结果才能被手动采纳')
    }

    const config = await this.configService.getConfig()

    // Apply customer status/tag updates from classify rules
    if (result.customerClassify && result.customerId) {
      await this.applyClassifyRulesToCustomer(result, config, user)
    }

    // Optionally create opportunity if not yet created
    if (config.autoCreateOpportunity && !result.opportunityCreated && result.customerId) {
      await this.tryCreateOpportunityFromResult(result, user)
    }

    result.status = AnalysisStatus.APPLIED
    result.appliedAt = new Date()
    return this.analysisRepo.save(result)
  }

  /**
   * Adds or overwrites the manual note field on an analysis result.
   * Used by sales staff to record their evaluation of the AI output.
   */
  async addManualNote(
    resultId: number,
    dto: ManualNoteDto,
    user?: AuthUser,
  ): Promise<CallAnalysisResult> {
    const result = await this.analysisRepo.findOne({ where: { id: resultId } })
    if (!result) throw new NotFoundException(`分析记录 #${resultId} 不存在`)

    // Data ownership check for SALES users
    if (user && user.role === UserRole.SALES && result.customerId) {
      const callRecord = await this.callRecordRepo.findOne({ where: { id: result.callRecordId } })
      if (callRecord && callRecord.userId !== user.id) {
        throw new BadRequestException('无权操作此分析记录')
      }
    }

    result.manualNote = dto.note
    return this.analysisRepo.save(result)
  }

  /**
   * Paginated list of analysis results with optional filters.
   */
  async getAnalysisList(
    query: QueryAnalysisDto,
    user?: AuthUser,
  ): Promise<{ list: CallAnalysisResult[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.analysisRepo.createQueryBuilder('r')

    // Data ownership: SALES users can only see their own call records' analyses
    if (user && user.role === UserRole.SALES) {
      qb.innerJoin('call_records', 'cr', 'cr.id = r.callRecordId').andWhere(
        'cr.user_id = :userId',
        { userId: user.id },
      )
    }

    if (query.callRecordId != null) {
      qb.andWhere('r.callRecordId = :callRecordId', { callRecordId: query.callRecordId })
    }
    if (query.customerId != null) {
      qb.andWhere('r.customerId = :customerId', { customerId: query.customerId })
    }
    if (query.customerClassify) {
      qb.andWhere('r.customerClassify = :classify', { classify: query.customerClassify })
    }
    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status })
    }
    if (query.startDate) {
      qb.andWhere('r.createdAt >= :startDate', { startDate: `${query.startDate} 00:00:00` })
    }
    if (query.endDate) {
      // Use next day 00:00:00 to include all records on endDate
      const nextDay = new Date(query.endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().slice(0, 10)
      qb.andWhere('r.createdAt < :endDate', { endDate: `${nextDayStr} 00:00:00` })
    }

    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  // ─── Private: text assembly ──────────────────────────────────────────────────

  /**
   * Builds combined analysis text from ASR transcript segments + call notes.
   * Queries transcripts via raw join to avoid importing RecordingFile / AsrTask
   * entities directly into this service's @InjectRepository list.
   */
  private async buildAnalysisInput(
    record: CallRecord,
  ): Promise<{ text: string; inputSource: AnalysisInputSource }> {
    // Check if any recording file linked to this call record is a voice_memo
    const hasVoiceMemo = await this.recordingFileRepo
      .createQueryBuilder('rf')
      .where('rf.call_record_id = :callRecordId', { callRecordId: record.id })
      .andWhere('rf.source_type = :sourceType', { sourceType: RecordingSourceType.VOICE_MEMO })
      .getCount()
      .then((count) => count > 0)

    // Join: call_transcripts → asr_tasks → recording_files → call_records
    const transcriptRows = await this.transcriptRepo
      .createQueryBuilder('ct')
      .innerJoin('asr_tasks', 'at', 'at.id = ct.asr_task_id')
      .innerJoin('recording_files', 'rf', 'rf.id = at.recording_file_id')
      .where('rf.call_record_id = :callRecordId', { callRecordId: record.id })
      .orderBy('ct.segment_index', 'ASC')
      .select(['ct.text', 'ct.speaker'])
      .getMany()

    const transcriptText = transcriptRows
      .filter((row) => row.text)
      .map((row) => `[${row.speaker}] ${row.text ?? ''}`)
      .join('\n')
      .trim()

    const notesText = record.notes?.trim() ?? ''

    if (transcriptText && notesText) {
      return {
        text: `【通话转写】\n${transcriptText}\n\n【通话备注】\n${notesText}`,
        inputSource: hasVoiceMemo ? AnalysisInputSource.VOICE_MEMO : AnalysisInputSource.BOTH,
      }
    }
    if (transcriptText) {
      return {
        text: hasVoiceMemo
          ? `【销售口述速记】\n${transcriptText}`
          : `【通话转写】\n${transcriptText}`,
        inputSource: hasVoiceMemo ? AnalysisInputSource.VOICE_MEMO : AnalysisInputSource.ASR,
      }
    }
    if (notesText) {
      return { text: `【通话备注】\n${notesText}`, inputSource: AnalysisInputSource.NOTES }
    }

    return { text: '', inputSource: AnalysisInputSource.BOTH }
  }

  // ─── Private: LLM calls ──────────────────────────────────────────────────────

  /**
   * Dedicated speech-scoring supplemental LLM call.
   * Mutates `parsed` in place with score and feedback if successful.
   */
  private async runSpeechScoring(
    config: AiAnalysisConfig,
    text: string,
    parsed: AnalysisJsonResult,
  ): Promise<void> {
    try {
      const scorePrompt = this.configService.resolveSpeechScoringPrompt(config)
      const systemPromptWithText = scorePrompt.replace('{transcriptText}', text)
      const raw = await this.aiService.chat(
        systemPromptWithText,
        '请按照要求对销售话术进行评分并返回 JSON 结果。',
        { temperature: 0.3, maxTokens: 512 },
      )
      const p = this.parseAiJson(raw)
      if (p.speechScore != null) parsed.speechScore = p.speechScore
      if (p.speechFeedback) parsed.speechFeedback = p.speechFeedback
    } catch (err) {
      this.logger.warn(`Supplemental speech-score call failed: ${String(err)}`)
    }
  }

  /**
   * Knowledge-gap analysis using KnowledgeService.ask().
   * Builds a question from the call text, asks the RAG engine, then extracts
   * any gaps with a second LLM call.
   * Mutates the `result` entity in place if gaps are identified.
   */
  private async runKnowledgeGapAnalysis(
    analysisText: string,
    result: CallAnalysisResult,
  ): Promise<void> {
    try {
      const question = `请根据以下销售通话内容，指出哪些产品知识或销售技巧未被充分利用或有所欠缺？\n\n${analysisText.slice(0, 800)}`

      const ragResult = await this.knowledgeService.ask(question, 3)

      // Use a lightweight LLM call to extract gaps from the RAG answer
      const gapPrompt = `根据以下知识库参考内容和销售通话分析，识别通话中缺失或利用不足的知识点。
返回 JSON: {"gaps": ["知识点1", "知识点2"], "matchRate": 0.65}
matchRate 表示知识库覆盖通话场景的比率（0–1）。

RAG 答案：${ragResult.answer.slice(0, 600)}`

      const gapRaw = await this.aiService.chat(gapPrompt, '请识别知识盲区并返回 JSON 结果。', {
        temperature: 0.2,
        maxTokens: 256,
      })
      const gapParsed = this.parseAiJson(gapRaw) as KnowledgeGapResult

      if (Array.isArray(gapParsed.gaps) && gapParsed.gaps.length > 0) {
        result.knowledgeGaps = gapParsed.gaps
        result.knowledgeMatchRate =
          typeof gapParsed.matchRate === 'number' ? gapParsed.matchRate : null
      }
    } catch (err) {
      this.logger.warn(`Knowledge gap analysis failed: ${String(err)}`)
    }
  }

  // ─── Private: classify rules application ────────────────────────────────────

  /**
   * Applies AI classify rules to the linked customer.
   *
   * Looks up the first matching ClassifyRule by customerClassify label,
   * then updates the customer's status and tags via CustomerService.
   * Optionally creates an Opportunity if the rule requests it and
   * config.autoCreateOpportunity is enabled.
   */
  private async applyClassifyRulesToCustomer(
    result: CallAnalysisResult,
    config: AiAnalysisConfig,
    user: AuthUser,
  ): Promise<void> {
    if (!result.customerId) return

    const rules = config.classifyRules as ClassifyRule[] | null
    const matchingRule = rules?.find((r) => r.label === result.customerClassify)

    try {
      const adminUser = makeAdminUser(user.id)

      // Update customer status / tags based on classify result
      const updatePayload: Partial<UpdateCustomerDto> = {}

      if (matchingRule?.customerStatus) {
        updatePayload.status = matchingRule.customerStatus as CustomerStatus
      } else if (result.suggestedStatus) {
        // Fall back to the AI-suggested status when no rule is configured
        updatePayload.status = result.suggestedStatus as CustomerStatus
      }

      if (result.suggestedTags && result.suggestedTags.length > 0) {
        // Merge AI-suggested tags with any additional tags from the rule
        const ruleTags = matchingRule?.suggestedTags ?? []
        const customer = await this.customerRepo.findOne({
          where: { id: result.customerId },
        })
        if (customer) {
          const existingTags: string[] = Array.isArray(customer.tags) ? customer.tags : []
          const newTags = [...new Set([...existingTags, ...result.suggestedTags, ...ruleTags])]
          updatePayload.tags = newTags
        }
      }

      if (Object.keys(updatePayload).length > 0) {
        await this.customerService.update(
          result.customerId,
          updatePayload as UpdateCustomerDto,
          adminUser,
        )
        this.logger.log(
          `Applied AI classify to customer #${result.customerId}: ${JSON.stringify(updatePayload)}`,
        )
      }

      // Optionally create opportunity
      if (matchingRule?.createOpportunity && config.autoCreateOpportunity) {
        await this.tryCreateOpportunityFromResult(result, user)
      }

      // Mark result as applied
      result.appliedAt = new Date()
      result.status = AnalysisStatus.APPLIED
      await this.analysisRepo.save(result)
    } catch (err) {
      this.logger.error(
        `Failed to apply classify rules to customer #${result.customerId}: ${String(err)}`,
        err instanceof Error ? err.stack : undefined,
      )
    }
  }

  /**
   * Creates a new Opportunity linked to the customer from this analysis result.
   * Mutates `result.opportunityCreated` and `result.opportunityId` in place.
   * Silently swallows errors so that a failed opportunity creation never
   * blocks the rest of the analysis pipeline.
   */
  private async tryCreateOpportunityFromResult(
    result: CallAnalysisResult,
    user: AuthUser,
  ): Promise<void> {
    if (!result.customerId) return

    try {
      const customer = await this.customerRepo.findOne({ where: { id: result.customerId } })
      if (!customer) return

      const opportunity = await this.opportunityService.create({
        title: `AI分析自动创建 - ${customer.name}`,
        customerId: customer.id,
        assignedUserId: user.id,
        stage: OpportunityStage.LEAD,
        source: 'ai_analysis',
        description: `由AI通话分析自动创建。分类：${result.customerClassify ?? '未知'}。\n摘要：${result.summary ?? ''}`,
      })

      result.opportunityCreated = true
      result.opportunityId = opportunity.id
      this.logger.log(
        `Auto-created opportunity #${opportunity.id} for customer #${customer.id} from analysis #${result.id}`,
      )
    } catch (err) {
      this.logger.warn(
        `Failed to auto-create opportunity for customer #${result.customerId}: ${String(err)}`,
      )
    }
  }

  // ─── Private: JSON parsing ───────────────────────────────────────────────────

  /**
   * Attempts to parse a JSON object from the AI response string.
   * Handles LLM responses that accidentally include markdown code fences.
   * Returns an empty object on parse failure (never throws).
   */
  private parseAiJson(raw: string): AnalysisJsonResult {
    // Extract JSON from optional markdown code fences (non-greedy)
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    const stripped = (fenceMatch ? fenceMatch[1] : raw).trim()
    try {
      return JSON.parse(stripped) as AnalysisJsonResult
    } catch {
      this.logger.warn(
        `Failed to parse AI JSON response — content snippet: "${stripped.slice(0, 80)}"`,
      )
      return {}
    }
  }

  // ─── Private: result field mapping ──────────────────────────────────────────

  /**
   * Maps parsed LLM JSON fields onto the CallAnalysisResult entity.
   * `classifyConfidence` is clamped to the [0, 1] range.
   */
  private applyParsedFieldsToResult(result: CallAnalysisResult, parsed: AnalysisJsonResult): void {
    result.summary = parsed.summary ?? null
    result.customerClassify = parsed.customerClassify ?? null
    result.suggestedStatus = parsed.suggestedStatus ?? null
    result.suggestedTags = parsed.suggestedTags ?? null
    result.speechFeedback = parsed.speechFeedback ?? null

    if (parsed.speechScore != null) {
      result.speechScore = Math.min(100, Math.max(0, Number(parsed.speechScore)))
    }

    if (parsed.confidence != null) {
      result.classifyConfidence = Math.min(1, Math.max(0, Number(parsed.confidence)))
    }

    if (parsed.knowledgeGaps) {
      result.knowledgeGaps = parsed.knowledgeGaps
    }
    if (parsed.matchRate != null) {
      result.knowledgeMatchRate = Math.min(1, Math.max(0, Number(parsed.matchRate)))
    }
  }
}
