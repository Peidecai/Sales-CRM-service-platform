import { Injectable, Logger } from '@nestjs/common'
import { AiService } from './ai.service'
import { RedisService } from '../../common/redis'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'

interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
}

@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name)

  constructor(
    private readonly aiService: AiService,
    private readonly redisService: RedisService,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /**
   * Chat with AI copilot, maintaining conversation history per user.
   */
  async chat(userId: number, message: string, context?: string): Promise<{ reply: string }> {
    const historyKey = `ai:copilot:history:${userId}`
    const cached = await this.redisService.safeGet(historyKey)
    const history: CopilotMessage[] = cached ? (JSON.parse(cached) as CopilotMessage[]) : []

    // Build context from history
    const recentHistory = history.slice(-10)
    const historyText = recentHistory
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `你是一个CRM销售助手。帮助销售人员回答关于客户管理、商机跟进、销售策略等问题。
${context ? `当前上下文: ${context}` : ''}
${historyText ? `\n对话历史:\n${historyText}` : ''}`

    const reply = await this.aiService.chat(systemPrompt, message, {
      temperature: 0.7,
      maxTokens: 2048,
    })

    // Update history
    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: reply })
    // Keep last 20 messages
    const trimmed = history.slice(-20)
    try {
      await this.redisService.set(historyKey, JSON.stringify(trimmed), 3600)
    } catch (error) {
      this.logger.warn(`Failed to save copilot history: ${String(error)}`)
    }

    return { reply }
  }

  /**
   * Natural language CRM query — parse intent and query relevant data.
   */
  async queryCrm(
    userId: number,
    naturalLanguageQuery: string,
  ): Promise<{ intent: string; data: unknown }> {
    if (naturalLanguageQuery.length > 500) {
      return { intent: 'error', data: { message: '查询内容过长，请精简后重试' } }
    }

    const systemPrompt = `你是一个CRM查询助手。根据用户的自然语言查询，识别查询意图并返回JSON格式的结果。
支持的意图: customer_search, opportunity_search, stats_summary
请返回JSON格式: {"intent": "意图", "params": {"keyword": "..."}}
只返回JSON，不要其他文本。`

    const intentStr = await this.aiService.chat(systemPrompt, naturalLanguageQuery, {
      temperature: 0.1,
      maxTokens: 256,
    })

    let parsed: { intent: string; params: Record<string, unknown> }
    try {
      parsed = JSON.parse(intentStr) as { intent: string; params: Record<string, unknown> }
    } catch {
      return { intent: 'unknown', data: { message: '无法理解查询意图，请重新描述' } }
    }

    switch (parsed.intent) {
      case 'customer_search': {
        const keyword = String(parsed.params?.keyword ?? '')
        const customers = await this.customerRepo
          .createQueryBuilder('c')
          .where('c.name LIKE :kw', { kw: `%${keyword}%` })
          .take(10)
          .getMany()
        return { intent: parsed.intent, data: customers }
      }
      case 'opportunity_search': {
        const keyword = String(parsed.params?.keyword ?? '')
        const opportunities = await this.opportunityRepo
          .createQueryBuilder('o')
          .where('o.title LIKE :kw', { kw: `%${keyword}%` })
          .take(10)
          .getMany()
        return { intent: parsed.intent, data: opportunities }
      }
      default:
        return { intent: parsed.intent, data: { message: '查询完成' } }
    }
  }

  /**
   * Suggest follow-up actions based on opportunity data.
   */
  async suggestFollowUps(opportunityId: number): Promise<{ suggestions: string[] }> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId },
      relations: ['customer'],
    })

    if (!opportunity) {
      return { suggestions: ['商机不存在'] }
    }

    const systemPrompt = `你是一个销售策略顾问。根据商机信息，给出3-5条具体可执行的跟进建议。
请以JSON数组格式返回: ["建议1", "建议2", ...]
只返回JSON数组，不要其他文本。`

    const context = `商机名称: ${opportunity.title}
阶段: ${opportunity.stage}
金额: ${opportunity.amount ?? '未知'}
客户: ${opportunity.customer?.name ?? '未知'}`

    const result = await this.aiService.chat(systemPrompt, context, {
      temperature: 0.5,
      maxTokens: 1024,
    })

    try {
      const suggestions = JSON.parse(result) as string[]
      return { suggestions }
    } catch {
      return { suggestions: [result] }
    }
  }
}
