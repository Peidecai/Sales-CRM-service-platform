import { Injectable, Logger } from '@nestjs/common'
import { AiService } from '../ai/ai.service'
import { AiConfigService } from './ai-config.service'
import { AiUsageService } from './ai-usage.service'
import { PlaygroundDto } from './dto/playground.dto'

export interface PlaygroundResult {
  response: string
  model: string
  latencyMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

@Injectable()
export class AiPlaygroundService {
  private readonly logger = new Logger(AiPlaygroundService.name)

  constructor(
    private readonly aiService: AiService,
    private readonly configService: AiConfigService,
    private readonly usageService: AiUsageService,
  ) {}

  async testPrompt(dto: PlaygroundDto, userId: number): Promise<PlaygroundResult> {
    const module = dto.module ?? 'default'
    const config = await this.configService.getConfig(module)

    const startTime = Date.now()
    let response = ''
    let isSuccess = true
    let errorMessage: string | null = null

    try {
      response = await this.aiService.chat(
        dto.systemPrompt ?? 'You are a helpful assistant.',
        dto.prompt,
        {
          temperature: Number(config.temperature),
          maxTokens: config.maxTokens,
        },
      )
    } catch (err: unknown) {
      isSuccess = false
      errorMessage = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Playground test failed: ${errorMessage}`)
    }

    const latencyMs = Date.now() - startTime
    // Rough token estimate (4 chars per token)
    const promptTokens = Math.ceil((dto.prompt.length + (dto.systemPrompt?.length ?? 0)) / 4)
    const completionTokens = Math.ceil(response.length / 4)
    const totalTokens = promptTokens + completionTokens

    await this.usageService.logUsage({
      module,
      model: config.model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost: totalTokens * 0.000002,
      latencyMs,
      isSuccess,
      errorMessage,
      triggeredById: userId,
    })

    return {
      response,
      model: config.model,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
    }
  }
}
