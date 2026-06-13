import { Processor, Process } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NegotiationAnalysis } from './entities/negotiation-analysis.entity'
import { CallRecordService } from '../call-record/call-record.service'
import { AiService } from '../ai/ai.service'
import { NegotiationStatus } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

const ANALYSIS_PROMPT = `你是一位专业的销售谈判分析师。请分析以下通话记录，评估谈判质量并提供详细分析。

请严格按以下 JSON 格式输出（不要包含其他文本）：
{
  "overallScore": <1-100的整数>,
  "strategy": "<competitive|collaborative|compromise|avoidant>",
  "concessions": [
    {"time": <秒>, "type": "<价格|条款|交付|其他>", "description": "<描述>", "impact": "<正面|负面|中性>"}
  ],
  "keyMoments": [
    {"time": <秒>, "event": "<事件描述>", "analysis": "<分析>"}
  ],
  "strengths": ["<优势1>", "<优势2>"],
  "weaknesses": ["<劣势1>", "<劣势2>"],
  "outcome": "<won|lost|pending|unknown>",
  "summary": "<200字以内的分析摘要>"
}`

@Processor('negotiation-analysis')
export class NegotiationAnalysisProcessor {
  private readonly logger = new Logger(NegotiationAnalysisProcessor.name)

  constructor(
    @InjectRepository(NegotiationAnalysis)
    private readonly repo: Repository<NegotiationAnalysis>,
    private readonly callRecordService: CallRecordService,
    private readonly aiService: AiService,
  ) {}

  @Process('analyze')
  async handleAnalysis(job: Job<{ analysisId: number }>): Promise<void> {
    const { analysisId } = job.data
    const analysis = await this.repo.findOne({ where: { id: analysisId } })
    if (!analysis) {
      this.logger.warn(`Analysis #${analysisId} not found, skipping`)
      return
    }

    try {
      analysis.status = NegotiationStatus.PROCESSING
      await this.repo.save(analysis)

      // Get call record
      const callRecord = await this.callRecordService.findOne(analysis.callRecordId, {
        id: analysis.userId,
        username: '',
        role: 'admin',
      } as AuthUser)

      const transcript = callRecord.aiSummary || callRecord.notes || ''
      if (!transcript) {
        analysis.status = NegotiationStatus.FAILED
        analysis.summary = 'No transcript or notes available for analysis'
        await this.repo.save(analysis)
        return
      }

      const userMessage = `通话记录ID: ${callRecord.id}
通话时长: ${callRecord.duration}秒
通话内容/摘要:
${transcript}`

      const result = await this.aiService.chat(ANALYSIS_PROMPT, userMessage, {
        temperature: 0.3,
        maxTokens: 2048,
      })

      // Parse JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response does not contain valid JSON')
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

      analysis.overallScore =
        typeof parsed.overallScore === 'number'
          ? Math.min(100, Math.max(1, Math.round(parsed.overallScore)))
          : null
      analysis.strategy = typeof parsed.strategy === 'string' ? parsed.strategy : null
      analysis.concessions = Array.isArray(parsed.concessions)
        ? (parsed.concessions as NegotiationAnalysis['concessions'])
        : null
      analysis.keyMoments = Array.isArray(parsed.keyMoments)
        ? (parsed.keyMoments as NegotiationAnalysis['keyMoments'])
        : null
      analysis.strengths = Array.isArray(parsed.strengths) ? (parsed.strengths as string[]) : null
      analysis.weaknesses = Array.isArray(parsed.weaknesses)
        ? (parsed.weaknesses as string[])
        : null
      analysis.outcome = typeof parsed.outcome === 'string' ? parsed.outcome : null
      analysis.summary = typeof parsed.summary === 'string' ? parsed.summary : null
      analysis.rawAnalysis = parsed
      analysis.status = NegotiationStatus.COMPLETED

      await this.repo.save(analysis)
      this.logger.log(`Analysis #${analysisId} completed, score: ${analysis.overallScore}`)
    } catch (error) {
      this.logger.error(`Analysis #${analysisId} failed: ${(error as Error).message}`)
      analysis.status = NegotiationStatus.FAILED
      analysis.summary = `Analysis failed: ${(error as Error).message}`
      await this.repo.save(analysis)
    }
  }
}
