import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallAnalysisResult } from './entities/call-analysis-result.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { CallTranscript } from '../recording/entities/call-transcript.entity'
import { RecordingFile } from '../recording/entities/recording-file.entity'
import {
  CloudTranscriptionCallback,
  CloudTranscriptionMatchStatus,
} from '../recording/entities/cloud-transcription-callback.entity'
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

/** Enriched analysis result with joined columns from related tables. */
export type AnalysisListItem = CallAnalysisResult & {
  customerName: string | null
  customerCompany: string | null
  salesUserName: string | null
  callDuration: number | null
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
    @InjectRepository(CloudTranscriptionCallback)
    private readonly cloudTranscriptionCallbackRepo: Repository<CloudTranscriptionCallback>,
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
   * Returns enriched data with customer/user names via getRawAndEntities.
   */
  async getAnalysisList(
    query: QueryAnalysisDto,
    user?: AuthUser,
  ): Promise<{
    list: AnalysisListItem[]
    total: number
    page: number
    pageSize: number
    tabs: { total: number; analyzed: number; pending: number }
  }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.analysisRepo
      .createQueryBuilder('r')
      .leftJoin('call_records', 'cr', 'cr.id = r.callRecordId')
      .leftJoin('customers', 'c', 'c.id = r.customerId')
      .leftJoin('users', 'u', 'u.id = cr.user_id')

    // Data ownership: SALES users can only see their own call records' analyses
    if (user && user.role === UserRole.SALES) {
      qb.andWhere('cr.user_id = :userId', { userId: user.id })
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
      const nextDay = new Date(query.endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().slice(0, 10)
      qb.andWhere('r.createdAt < :endDate', { endDate: `${nextDayStr} 00:00:00` })
    }
    // New filters — joined table columns use raw names
    if (query.userId != null) {
      qb.andWhere('cr.user_id = :filterUserId', { filterUserId: query.userId })
    }
    if (query.minDuration != null) {
      qb.andWhere('cr.duration >= :minDuration', { minDuration: query.minDuration })
    }
    if (query.maxDuration != null) {
      qb.andWhere('cr.duration <= :maxDuration', { maxDuration: query.maxDuration })
    }
    if (query.inputSource) {
      qb.andWhere('r.inputSource = :inputSource', { inputSource: query.inputSource })
    }

    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .addSelect('c.name', 'customerName')
      .addSelect('c.company', 'customerCompany')
      .addSelect('u.name', 'salesUserName')
      .addSelect('cr.duration', 'callDuration')

    const { raw, entities } = await qb.getRawAndEntities()
    const total = await qb.getCount()

    // Merge raw joined columns into entity results
    const list = entities.map((entity, i) => {
      const item = entity as AnalysisListItem
      item.customerName = (raw[i]?.customerName as string) ?? null
      item.customerCompany = (raw[i]?.customerCompany as string) ?? null
      item.salesUserName = (raw[i]?.salesUserName as string) ?? null
      item.callDuration = raw[i]?.callDuration != null ? Number(raw[i].callDuration) : null
      return item
    })

    // Tab counts — same ownership + filter scope (#6 fix)
    const tabsQb = this.analysisRepo.createQueryBuilder('r2')
    if (user && user.role === UserRole.SALES) {
      tabsQb
        .innerJoin('call_records', 'cr2', 'cr2.id = r2.callRecordId')
        .andWhere('cr2.user_id = :tabUserId', { tabUserId: user.id })
    }
    if (query.customerClassify) {
      tabsQb.andWhere('r2.customerClassify = :tabClassify', { tabClassify: query.customerClassify })
    }
    if (query.startDate) {
      tabsQb.andWhere('r2.createdAt >= :tabStart', { tabStart: `${query.startDate} 00:00:00` })
    }
    if (query.endDate) {
      const nextDay = new Date(query.endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      tabsQb.andWhere('r2.createdAt < :tabEnd', {
        tabEnd: `${nextDay.toISOString().slice(0, 10)} 00:00:00`,
      })
    }
    const tabsRaw = await tabsQb
      .select('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN r2.status IN ('completed','applied') THEN 1 ELSE 0 END)`,
        'analyzed',
      )
      .addSelect(`SUM(CASE WHEN r2.status = 'pending' THEN 1 ELSE 0 END)`, 'pending')
      .getRawOne<{ total: string; analyzed: string; pending: string }>()

    const tabs = {
      total: parseInt(tabsRaw?.total ?? '0', 10),
      analyzed: parseInt(tabsRaw?.analyzed ?? '0', 10),
      pending: parseInt(tabsRaw?.pending ?? '0', 10),
    }

    return { list, total, page, pageSize, tabs }
  }

  /**
   * Get the latest COMPLETED analysis for a customer.
   */
  async getLatestByCustomer(
    customerId: number,
    user?: AuthUser,
  ): Promise<CallAnalysisResult | null> {
    const qb = this.analysisRepo
      .createQueryBuilder('r')
      .where('r.customerId = :customerId', { customerId })
      .andWhere('r.status = :status', { status: AnalysisStatus.COMPLETED })
      .orderBy('r.createdAt', 'DESC')

    if (user && user.role === UserRole.SALES) {
      qb.innerJoin('call_records', 'cr', 'cr.id = r.callRecordId').andWhere(
        'cr.user_id = :userId',
        { userId: user.id },
      )
    }

    return qb.getOne()
  }

  /**
   * Aggregate all call analyses for an opportunity (deal analysis).
   * Returns per-analysis intent trends + overall stats.
   */
  async getDealAnalysis(
    opportunityId: number,
    user?: AuthUser,
  ): Promise<{
    analyses: CallAnalysisResult[]
    intentTrend: { date: string; classify: string | null; confidence: number | null }[]
    summary: { total: number; avgSpeechScore: number | null; avgConfidence: number | null }
  }> {
    // Get call records linked to this opportunity
    const crQb = this.callRecordRepo
      .createQueryBuilder('cr')
      .where('cr.opportunityId = :opportunityId', { opportunityId })
      .select(['cr.id'])
    if (user && user.role === UserRole.SALES) {
      crQb.andWhere('cr.userId = :userId', { userId: user.id })
    }
    const callRecords = await crQb.getMany()
    const callRecordIds = callRecords.map((cr) => cr.id)

    if (callRecordIds.length === 0) {
      return {
        analyses: [],
        intentTrend: [],
        summary: { total: 0, avgSpeechScore: null, avgConfidence: null },
      }
    }

    const analyses = await this.analysisRepo
      .createQueryBuilder('r')
      .where('r.callRecordId IN (:...ids)', { ids: callRecordIds })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [AnalysisStatus.COMPLETED, AnalysisStatus.APPLIED],
      })
      .orderBy('r.createdAt', 'ASC')
      .getMany()

    const intentTrend = analyses.map((a) => ({
      date: a.createdAt.toISOString().slice(0, 10),
      classify: a.customerClassify,
      confidence: a.classifyConfidence,
    }))

    const speechScores = analyses.map((a) => a.speechScore).filter((s): s is number => s != null)
    const confidences = analyses
      .map((a) => a.classifyConfidence)
      .filter((c): c is number => c != null)

    return {
      analyses,
      intentTrend,
      summary: {
        total: analyses.length,
        avgSpeechScore:
          speechScores.length > 0
            ? Math.round(speechScores.reduce((a, b) => a + b, 0) / speechScores.length)
            : null,
        avgConfidence:
          confidences.length > 0
            ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
            : null,
      },
    }
  }

  /**
   * Aggregate all call analyses for a customer — stats, trends, and summary.
   * Uses fresh QueryBuilder per query (no clone) and Promise.all for concurrency.
   */
  async getCustomerCallSummary(
    customerId: number,
    user: AuthUser,
  ): Promise<{
    totalCalls: number
    totalAnalyzed: number
    avgSpeechScore: number | null
    avgKnowledgeMatchRate: number | null
    speechScoreTrend: { date: string; score: number }[]
    knowledgeCoverageTrend: { date: string; rate: number }[]
    topClassifications: { label: string; count: number }[]
    overallSummary: string | null
  }> {
    const isSales = user.role === UserRole.SALES
    const completedStatuses = [AnalysisStatus.COMPLETED, AnalysisStatus.APPLIED]

    /** Build a fresh analysis QueryBuilder with ownership filter applied. */
    const makeAnalysisQb = () => {
      const qb = this.analysisRepo
        .createQueryBuilder('r')
        .innerJoin('call_records', 'cr', 'cr.id = r.callRecordId')
        .where('r.customerId = :customerId', { customerId })
        .andWhere('r.status IN (:...statuses)', { statuses: completedStatuses })
      if (isSales) {
        qb.andWhere('cr.user_id = :userId', { userId: user.id })
      }
      return qb
    }

    // Total calls for this customer
    const totalCallsQb = this.callRecordRepo
      .createQueryBuilder('cr2')
      .where('cr2.customerId = :customerId', { customerId })
    if (isSales) {
      totalCallsQb.andWhere('cr2.userId = :userId', { userId: user.id })
    }

    // Run all 6 queries concurrently
    const [totalCalls, statsRaw, speechTrendRaw, knowledgeTrendRaw, classifyRaw, recentSummaries] =
      await Promise.all([
        // 1. Total calls
        totalCallsQb.getCount(),

        // 2. Aggregate stats
        makeAnalysisQb()
          .select('COUNT(*)', 'totalAnalyzed')
          .addSelect('AVG(r.speechScore)', 'avgSpeechScore')
          .addSelect('AVG(r.knowledgeMatchRate)', 'avgKnowledgeMatchRate')
          .getRawOne<{
            totalAnalyzed: string
            avgSpeechScore: string | null
            avgKnowledgeMatchRate: string | null
          }>(),

        // 3. Speech score trend by date
        makeAnalysisQb()
          .select('DATE(r.createdAt)', 'date')
          .addSelect('AVG(r.speechScore)', 'score')
          .andWhere('r.speechScore IS NOT NULL')
          .groupBy('DATE(r.createdAt)')
          .orderBy('DATE(r.createdAt)', 'ASC')
          .getRawMany<{ date: string; score: string }>(),

        // 4. Knowledge coverage trend by date
        makeAnalysisQb()
          .select('DATE(r.createdAt)', 'date')
          .addSelect('AVG(r.knowledgeMatchRate)', 'rate')
          .andWhere('r.knowledgeMatchRate IS NOT NULL')
          .groupBy('DATE(r.createdAt)')
          .orderBy('DATE(r.createdAt)', 'ASC')
          .getRawMany<{ date: string; rate: string }>(),

        // 5. Top classifications
        makeAnalysisQb()
          .select('r.customerClassify', 'label')
          .addSelect('COUNT(*)', 'count')
          .andWhere('r.customerClassify IS NOT NULL')
          .groupBy('r.customerClassify')
          .orderBy('count', 'DESC')
          .take(10)
          .getRawMany<{ label: string; count: string }>(),

        // 6. Recent summaries
        makeAnalysisQb()
          .select(['r.summary', 'r.createdAt'])
          .andWhere('r.summary IS NOT NULL')
          .orderBy('r.createdAt', 'DESC')
          .take(3)
          .getMany(),
      ])

    const totalAnalyzed = parseInt(statsRaw?.totalAnalyzed ?? '0', 10)
    const avgSpeechScore =
      statsRaw?.avgSpeechScore != null
        ? Math.round(Number(statsRaw.avgSpeechScore) * 10) / 10
        : null
    const avgKnowledgeMatchRate =
      statsRaw?.avgKnowledgeMatchRate != null
        ? Math.round(Number(statsRaw.avgKnowledgeMatchRate) * 100) / 100
        : null

    const speechScoreTrend = speechTrendRaw.map((row) => ({
      date:
        typeof row.date === 'string'
          ? row.date.slice(0, 10)
          : new Date(row.date).toISOString().slice(0, 10),
      score: Math.round(Number(row.score) * 10) / 10,
    }))

    const knowledgeCoverageTrend = knowledgeTrendRaw.map((row) => ({
      date:
        typeof row.date === 'string'
          ? row.date.slice(0, 10)
          : new Date(row.date).toISOString().slice(0, 10),
      rate: Math.round(Number(row.rate) * 100) / 100,
    }))

    const topClassifications = classifyRaw.map((row) => ({
      label: row.label,
      count: parseInt(row.count, 10),
    }))

    const overallSummary =
      recentSummaries.length > 0
        ? recentSummaries
            .map((r) => `[${r.createdAt?.toISOString().slice(0, 10)}] ${r.summary}`)
            .filter(Boolean)
            .join('\n\n')
        : null

    return {
      totalCalls,
      totalAnalyzed,
      avgSpeechScore,
      avgKnowledgeMatchRate,
      speechScoreTrend,
      knowledgeCoverageTrend,
      topClassifications,
      overallSummary,
    }
  }

  /**
   * Export analysis list as CSV-ready data.
   */
  async exportAnalysisList(
    query: QueryAnalysisDto,
    user?: AuthUser,
  ): Promise<{ list: AnalysisListItem[]; total: number }> {
    const overrideQuery = { ...query, page: 1, pageSize: Math.min(query.pageSize ?? 5000, 5000) }
    const result = await this.getAnalysisList(overrideQuery, user)
    return { list: result.list, total: result.total }
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

    let transcriptText = transcriptRows
      .filter((row) => row.text)
      .map((row) => `[${row.speaker}] ${row.text ?? ''}`)
      .join('\n')
      .trim()

    if (!transcriptText) {
      transcriptText = await this.getMatchedCloudTranscriptText(record.id)
      if (transcriptText) {
        this.logger.warn(
          `Using matched cloud transcription callback text for call record #${record.id} because call_transcripts is empty`,
        )
      }
    }

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
   * Uses the latest matched cloud transcription callback as a fallback when
   * normalized ASR transcript rows have not been created yet.
   */
  private async getMatchedCloudTranscriptText(callRecordId: number): Promise<string> {
    const callbacks = await this.cloudTranscriptionCallbackRepo
      .createQueryBuilder('ctc')
      .where('ctc.matchedCallRecordId = :callRecordId', { callRecordId })
      .andWhere('ctc.matchStatus = :matchStatus', {
        matchStatus: CloudTranscriptionMatchStatus.MATCHED,
      })
      .andWhere('ctc.transcriptText IS NOT NULL')
      .orderBy('ctc.createdAt', 'DESC')
      .select(['ctc.taskId', 'ctc.transcriptText'])
      .take(5)
      .getMany()

    return (
      callbacks
        .map((callback) => callback.transcriptText?.trim())
        .find((text): text is string => Boolean(text)) ?? ''
    )
  }

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
