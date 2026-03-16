import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiAnalysisConfig } from './entities/ai-analysis-config.entity'
import { UpdateAnalysisConfigDto } from './dto/update-analysis-config.dto'
import { RedisService } from '../../common/redis/redis.service'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis/cache-keys'

// ─── Default prompt constants ─────────────────────────────────────────────────

/**
 * 通话全量分析提示词。
 * 占位符 `{transcriptText}` 由调用方在运行时替换为实际文本。
 * 模型需严格返回 JSON（不含 markdown 代码块）。
 */
export const DEFAULT_CALL_ANALYSIS_PROMPT = `你是一名专业的销售通话分析专家，具有丰富的 B2B 销售经验，
擅长从通话记录中识别客户意图、需求痛点及成交信号。

请对以下通话记录进行深度分析，以 JSON 格式输出结果（不要添加 markdown 代码块标记）。

通话记录：
{transcriptText}

输出 JSON 结构（字段含义见注释）：
{
  "customerClassify": "客户分类标签，示例值：高意向、中意向、低意向、暂无需求、竞品用户、已成交、无效通话",
  "confidence": 0.85,
  "summary": "通话综合摘要，200 字以内，涵盖：客户现状 / 主要需求 / 通话结论 / 下一步行动",
  "suggestedStatus": "建议客户状态，取值之一：lead/potential/intention/opportunity/deal/maintain/invalid/lost",
  "suggestedTags": ["标签1", "标签2"],
  "keyPoints": ["通话关键信息1", "关键信息2"],
  "customerNeeds": "客户明确表达的需求或潜在需求",
  "objections": "客户提出的主要异议或顾虑",
  "nextAction": "销售建议的下一步跟进行动（需具体、可执行）",
  "speechScore": 75,
  "speechFeedback": "话术综合评价：指出 1-2 个优点和 1-2 个改进建议，50 字以内"
}

分析要求：
1. customerClassify 需根据整段对话综合判断，不可凭单一关键词判定
2. confidence 取值范围 0–1（保留两位小数），反映分类的置信度
3. suggestedTags 最多 5 个，精炼具体，如"对价格敏感"、"已有竞品"
4. summary 必须包含：客户现状、主要需求、本次通话结论
5. speechScore 评分范围 0–100，参考维度：开场白、需求挖掘、产品介绍、异议处理、推进成交
6. 若通话内容过短或无实质内容，customerClassify 设为"无效通话"，confidence 设为 0`

/**
 * 客户分类独立提示词（用于补充分类场景，逻辑更聚焦）。
 * 占位符 `{transcriptText}` 由调用方替换。
 */
export const DEFAULT_CUSTOMER_CLASSIFY_PROMPT = `你是一名 CRM 销售顾问，擅长根据通话内容判断客户价值分层与购买意向。

通话记录：
{transcriptText}

请对客户进行分类，输出 JSON（不含 markdown 标记）：
{
  "customerClassify": "高意向 | 中意向 | 低意向 | 暂无需求 | 竞品用户 | 已成交 | 无效客户",
  "confidence": 0.90,
  "reason": "分类依据，50 字以内",
  "suggestedStatus": "lead | potential | intention | opportunity | deal | maintain | invalid | lost",
  "suggestedTags": ["标签1"],
  "priority": "high | medium | low",
  "estimatedDealCycle": "预计成交周期，示例：1 个月内、3 个月、半年以上、暂无"
}

分类标准：
- 高意向：有明确采购需求、预算、时间节点，表现出强烈购买意愿
- 中意向：有需求但预算或时间节点不明确，需持续跟进培育
- 低意向：有兴趣但短期无购买计划，可纳入长期培育池
- 暂无需求：当前无明确需求，可标记为待激活状态
- 竞品用户：已使用竞争对手产品，重点挖掘痛点与差异化优势
- 已成交：本次通话确认成交或续约
- 无效客户：无效线索、误拨、拒绝沟通，无后续跟进价值`

/**
 * 话术评分提示词。
 * 占位符 `{transcriptText}` 由调用方替换。
 * 要求模型对销售人员的话术进行多维度专业打分。
 */
export const DEFAULT_SPEECH_SCORING_PROMPT = `你是一名专业的销售培训专家，负责评估销售人员（坐席）的通话话术质量，
帮助提升团队整体销售能力。

通话记录：
{transcriptText}

请对销售人员的话术表现进行评分，输出 JSON（不含 markdown 标记）：
{
  "totalScore": 78,
  "dimensions": {
    "opening": {
      "score": 8,
      "maxScore": 10,
      "comment": "开场白是否礼貌专业、能有效建立沟通关系"
    },
    "needsDiscovery": {
      "score": 20,
      "maxScore": 25,
      "comment": "是否善用提问技巧，准确识别客户需求与痛点"
    },
    "productPresentation": {
      "score": 15,
      "maxScore": 20,
      "comment": "是否针对性推介，逻辑清晰，突出产品价值"
    },
    "objectionHandling": {
      "score": 14,
      "maxScore": 20,
      "comment": "是否有效化解顾虑，灵活转化负面情绪"
    },
    "closing": {
      "score": 13,
      "maxScore": 15,
      "comment": "是否适时推进，把握成交节点"
    },
    "farewell": {
      "score": 8,
      "maxScore": 10,
      "comment": "是否明确下一步行动，礼貌友好地结束通话"
    }
  },
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"],
  "overallFeedback": "综合评语，100 字以内"
}

评分规则：
- totalScore = 所有维度得分之和（满分 100）
- 各维度满分见 maxScore 字段
- overallFeedback 需具体指出 1–2 个亮点和 1–2 个可提升的方向`

/**
 * 语音速记专用分析提示词（方案B）。
 * 用于销售口述通话要点的场景，与双方对话分析 Prompt 区分。
 * 占位符 `{transcriptText}` 由调用方替换。
 */
export const DEFAULT_VOICE_MEMO_PROMPT = `你是专业的销售通话分析师。以下是销售人员在通话结束后口述的通话要点摘要。

重要提示：这是销售人员的单方口述描述，不是原始通话录音的逐句转写，因此：
1. 信息可能存在主观偏差，分析结果中请标注"基于销售描述"
2. 话术评分和情感分析的置信度较低，请在 speechFeedback 中明确说明
3. 重点提取客户需求、异议、承诺事项和后续行动计划

销售口述内容：
{transcriptText}

请以 JSON 格式输出分析结果（不要添加 markdown 代码块标记）：
{
  "customerClassify": "客户分类标签：高意向/中意向/低意向/暂无需求/竞品用户/已成交/无效通话",
  "confidence": 0.60,
  "summary": "通话摘要（基于销售描述），200字以内",
  "suggestedStatus": "lead/potential/intention/opportunity/deal/maintain/invalid/lost",
  "suggestedTags": ["标签1", "标签2"],
  "keyPoints": ["关键信息1", "关键信息2"],
  "customerNeeds": "销售提到的客户需求",
  "objections": "销售提到的客户异议或顾虑",
  "nextAction": "销售承诺的后续行动或下一步计划",
  "speechScore": null,
  "speechFeedback": "基于销售口述，无法准确评估话术质量。建议结合实际通话录音进行评分。"
}

分析要求：
1. confidence 应适当降低（通常 0.4–0.7），反映单方描述的局限性
2. summary 开头需注明"基于销售描述"
3. speechScore 设为 null（口述无法评估话术），speechFeedback 中说明原因
4. 重点关注：客户需求提取、异议识别、后续行动计划是否明确
5. 若口述内容过于简短或无实质信息，customerClassify 设为"无效通话"，confidence 设为 0`

// ─── Shared interface (exported so call-analysis.service can import) ───────────

/** AI 分析 JSON 响应的统一结构 */
export interface AnalysisJsonResult {
  /** 客户分类标签 */
  customerClassify?: string
  /** 分类置信度 0–1 */
  confidence?: number
  /** 通话综合摘要 */
  summary?: string
  /** 建议客户状态（CustomerStatus 枚举值） */
  suggestedStatus?: string
  /** 建议标签 */
  suggestedTags?: string[]
  /** 关键信息列表 */
  keyPoints?: string[]
  /** 客户需求描述 */
  customerNeeds?: string
  /** 客户异议 */
  objections?: string
  /** 下一步行动建议 */
  nextAction?: string
  /** 话术总分 0–100 */
  speechScore?: number
  /** 话术评语 */
  speechFeedback?: string
  /** 知识盲区列表 */
  knowledgeGaps?: string[]
  /** 知识覆盖率 0–1 */
  matchRate?: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AiAnalysisConfigService {
  private readonly logger = new Logger(AiAnalysisConfigService.name)

  constructor(
    @InjectRepository(AiAnalysisConfig)
    private readonly configRepo: Repository<AiAnalysisConfig>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Returns the singleton config row (id = 1).
   * Cache hit → parse JSON and return.
   * Cache miss → load or create with defaults → cache → return.
   */
  async getConfig(): Promise<AiAnalysisConfig> {
    const cacheKey = CACHE_KEYS.AI_ANALYSIS_CONFIG
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) return JSON.parse(cached) as AiAnalysisConfig

    let config = await this.configRepo.findOne({ where: { id: 1 } })
    if (!config) {
      this.logger.log('AI analysis config not found — seeding defaults (id=1)')
      config = this.configRepo.create({ id: 1, ...this.buildDefaults() })
      config = await this.configRepo.save(config)
    }

    await this.redisService.set(cacheKey, JSON.stringify(config), CACHE_TTL.AI_ANALYSIS_CONFIG)
    return config
  }

  /**
   * Partial-update the singleton config. Invalidates cache on write.
   */
  async updateConfig(dto: UpdateAnalysisConfigDto, userId: number): Promise<AiAnalysisConfig> {
    let config = await this.configRepo.findOne({ where: { id: 1 } })
    if (!config) {
      config = this.configRepo.create({ id: 1, ...this.buildDefaults() })
    }

    // Only apply known config fields (prevent overwriting id/updatedAt)
    const allowedKeys: (keyof UpdateAnalysisConfigDto)[] = [
      'callAnalysisEnabled',
      'customerClassifyEnabled',
      'speechScoringEnabled',
      'knowledgeCompareEnabled',
      'autoCreateOpportunity',
      'chatModel',
      'embeddingModel',
      'callAnalysisPrompt',
      'customerClassifyPrompt',
      'speechScoringPrompt',
      'classifyRules',
    ]
    for (const key of allowedKeys) {
      if (dto[key] !== undefined) {
        ;(config as unknown as Record<string, unknown>)[key] = dto[key]
      }
    }
    config.updatedBy = userId
    const saved = await this.configRepo.save(config)

    await this.redisService.del(CACHE_KEYS.AI_ANALYSIS_CONFIG)
    this.logger.log(`AI analysis config updated by user ${userId}`)
    return saved
  }

  /**
   * Returns the built-in default prompt texts.
   * Useful for admin UI to display baseline before customisation.
   */
  getDefaultPrompts(): {
    callAnalysis: string
    customerClassify: string
    speechScoring: string
    voiceMemo: string
  } {
    return {
      callAnalysis: DEFAULT_CALL_ANALYSIS_PROMPT,
      customerClassify: DEFAULT_CUSTOMER_CLASSIFY_PROMPT,
      speechScoring: DEFAULT_SPEECH_SCORING_PROMPT,
      voiceMemo: DEFAULT_VOICE_MEMO_PROMPT,
    }
  }

  /**
   * Resolves the effective call-analysis prompt.
   * Uses DB-stored custom prompt when set; falls back to the built-in default.
   */
  resolveCallAnalysisPrompt(config: AiAnalysisConfig): string {
    return config.callAnalysisPrompt ?? DEFAULT_CALL_ANALYSIS_PROMPT
  }

  /**
   * Resolves the effective customer-classify prompt.
   */
  resolveCustomerClassifyPrompt(config: AiAnalysisConfig): string {
    return config.customerClassifyPrompt ?? DEFAULT_CUSTOMER_CLASSIFY_PROMPT
  }

  /**
   * Resolves the effective speech-scoring prompt.
   */
  resolveSpeechScoringPrompt(config: AiAnalysisConfig): string {
    return config.speechScoringPrompt ?? DEFAULT_SPEECH_SCORING_PROMPT
  }

  /**
   * Resolves the effective voice-memo analysis prompt (方案B口述速记).
   */
  resolveVoiceMemoPrompt(config: AiAnalysisConfig): string {
    return config.voiceMemoPrompt ?? DEFAULT_VOICE_MEMO_PROMPT
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Default field values used on first-time row creation */
  private buildDefaults(): Omit<AiAnalysisConfig, 'id' | 'updatedAt'> {
    return {
      callAnalysisEnabled: true,
      customerClassifyEnabled: true,
      speechScoringEnabled: true,
      knowledgeCompareEnabled: false,
      autoCreateOpportunity: false,
      chatModel: 'qwen-plus',
      embeddingModel: 'text-embedding-v3',
      callAnalysisPrompt: null,
      customerClassifyPrompt: null,
      speechScoringPrompt: null,
      voiceMemoPrompt: null,
      classifyRules: null,
      updatedBy: null,
    }
  }
}
