import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerProfile } from './entities/customer-profile.entity'
import { AiFallbackService } from './ai-fallback.service'

export interface ScriptItem {
  scene: string
  content: string
  tip: string
}

export interface ScriptRecommendResult {
  scripts: ScriptItem[]
}

@Injectable()
export class ScriptRecommendService {
  private readonly logger = new Logger(ScriptRecommendService.name)

  constructor(
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    private readonly aiFallback: AiFallbackService,
  ) {}

  async recommend(customerId: number, opportunityId?: number): Promise<ScriptRecommendResult> {
    // Load customer profile if exists
    const profile = await this.profileRepo.findOne({ where: { customerId } })

    const contextParts: string[] = [`客户ID: ${customerId}`]
    if (profile) {
      contextParts.push(`DISC类型: ${profile.discType ?? '未知'}`)
      contextParts.push(`沟通风格: ${profile.communicationStyle ?? '未知'}`)
      if (profile.painPoints && profile.painPoints.length > 0) {
        contextParts.push(`痛点: ${profile.painPoints.join('、')}`)
      }
      contextParts.push(`健康度: ${profile.healthScore ?? '未知'}`)
    }

    if (opportunityId) {
      contextParts.push(`商机ID: ${opportunityId}`)
    }

    const prompt = `根据以下客户信息推荐3-5条销售话术：\n${contextParts.join('\n')}\n\n请返回JSON: { "scripts": [{ "scene": "场景名", "content": "话术内容", "tip": "使用技巧" }] }`

    const result = await this.aiFallback.invokeWithFallback('script_recommend', prompt)

    try {
      const parsed = JSON.parse(result.text)
      if (parsed.scripts && Array.isArray(parsed.scripts)) {
        return { scripts: parsed.scripts }
      }
    } catch {
      // Parse failure, return default
    }

    return {
      scripts: [
        {
          scene: '开场白',
          content: '您好，我是XX公司的销售顾问，很高兴与您沟通。',
          tip: '保持热情友好',
        },
        {
          scene: '需求挖掘',
          content: '请问您目前在这方面有什么困扰或需求吗？',
          tip: '多倾听少推销',
        },
        {
          scene: '价值呈现',
          content: '我们的产品可以帮助您解决XX问题，提升XX效率。',
          tip: '结合客户痛点',
        },
      ],
    }
  }
}
