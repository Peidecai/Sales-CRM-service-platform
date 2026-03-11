import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PromptTemplate } from './entities/prompt-template.entity'

export interface PromptMessages {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

@Injectable()
export class PromptManagerService {
  private readonly logger = new Logger(PromptManagerService.name)

  private readonly systemRoles: Record<string, string> = {
    call_summary: '你是一个专业的销售通话分析助手，擅长从通话记录中提取关键信息。',
    customer_profile: '你是一个专业的客户画像分析师，擅长分析客户性格和行为模式。',
    intent_prediction: '你是一个销售预测专家，擅长分析客户购买意向和成交概率。',
    anomaly_detect: '你是一个销售数据异常检测专家，擅长发现潜在风险和异常模式。',
    report_generate: '你是一个销售数据分析师，擅长生成专业的销售分析报告。',
    sales_forecast: '你是一个销售预测分析师，擅长基于历史数据预测未来销售收入。',
    competitor_analysis: '你是一个竞品分析专家，擅长从销售数据中提取竞品情报。',
    script_recommend: '你是一个销售话术顾问，擅长根据客户特征推荐个性化话术。',
  }

  constructor(
    @InjectRepository(PromptTemplate)
    private readonly templateRepo: Repository<PromptTemplate>,
  ) {}

  async getPrompt(
    featureKey: string,
    userContent: string,
    options?: { tenantId?: number; version?: string },
  ): Promise<{ system: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }> {
    // Layer 1: System role
    const systemRole = this.systemRoles[featureKey] ?? '你是一个专业的AI助手。'

    // Layer 2: Feature instruction from DB
    const template = await this.getTemplate(featureKey, options)
    const featureInstruction = template?.content ?? ''

    // Layer 3: Output JSON Schema constraint
    const jsonSchema = '请以严格的JSON格式输出结果，不要包含markdown代码块标记。'

    // Layer 4: Tenant custom override
    let tenantOverride = ''
    if (options?.tenantId) {
      const tenantTemplate = await this.templateRepo.findOne({
        where: {
          featureKey,
          isActive: true,
          tenantId: options.tenantId,
        },
        order: { createdAt: 'DESC' },
      })
      if (tenantTemplate) {
        tenantOverride = `\n\n附加要求：${tenantTemplate.content}`
      }
    }

    const system = [systemRole, featureInstruction, jsonSchema, tenantOverride]
      .filter(Boolean)
      .join('\n\n')

    return {
      system,
      messages: [{ role: 'user', content: userContent }],
    }
  }

  private async getTemplate(
    featureKey: string,
    options?: { tenantId?: number; version?: string },
  ): Promise<PromptTemplate | null> {
    const where: Record<string, unknown> = {
      featureKey,
      isActive: true,
      tenantId: null as number | null, // Default (non-tenant) templates only
    }

    if (options?.version) {
      where['version'] = options.version
    }

    const templates = await this.templateRepo.find({
      where: where as Record<string, unknown>,
      order: { createdAt: 'DESC' },
    })

    if (templates.length === 0) return null

    // A/B test: if template is in A/B mode, randomly select based on ratio
    const abTemplates = templates.filter((t) => t.isAbTest)
    if (abTemplates.length >= 2) {
      const ratio = abTemplates[0].abRatio
      return Math.random() < ratio ? abTemplates[0] : abTemplates[1]
    }

    return templates[0]
  }
}
