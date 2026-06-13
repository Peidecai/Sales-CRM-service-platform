import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'

export interface ClaudeResult {
  text: string
  usage?: { inputTokens: number; outputTokens: number }
  model: string
}

export interface ClaudeOptions {
  temperature?: number
  maxTokens?: number
  system?: string
  timeoutMs?: number
}

@Injectable()
export class ClaudeService implements OnModuleInit {
  private readonly logger = new Logger(ClaudeService.name)
  private client!: Anthropic
  private model!: string
  private limiter!: (fn: () => Promise<ClaudeResult>) => Promise<ClaudeResult>
  private enabled = false

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY', '')
    this.model = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not set — ClaudeService will be unavailable')
      return
    }

    this.client = new Anthropic({ apiKey })
    this.enabled = true

    // Dynamic import for p-limit (ESM module)
    const pLimit = (await import('p-limit')).default
    this.limiter = pLimit(5)

    this.logger.log(`ClaudeService initialized (model: ${this.model})`)
  }

  isAvailable(): boolean {
    return this.enabled
  }

  async generate(
    prompt: string | Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: ClaudeOptions,
  ): Promise<ClaudeResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'ClaudeService is not available — ANTHROPIC_API_KEY not configured',
      )
    }

    return this.limiter(() => this.executeWithRetry(prompt, options))
  }

  private async executeWithRetry(
    prompt: string | Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: ClaudeOptions,
    retries = 3,
  ): Promise<ClaudeResult> {
    const messages =
      typeof prompt === 'string' ? [{ role: 'user' as const, content: prompt }] : prompt

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await Promise.race([
          this.client.messages.create({
            model: this.model,
            max_tokens: options?.maxTokens ?? 2048,
            temperature: options?.temperature ?? 0.7,
            system: options?.system,
            messages,
          }),
          this.timeout(options?.timeoutMs ?? 120000),
        ])

        const result = response as Anthropic.Message
        const textBlock = result.content.find((b) => b.type === 'text')

        return {
          text: textBlock?.type === 'text' ? textBlock.text : '',
          usage: {
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
          },
          model: result.model,
        }
      } catch (error) {
        const isLast = attempt === retries - 1
        if (isLast) throw error

        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        this.logger.warn(`Claude API attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await this.sleep(delay)
      }
    }

    throw new ServiceUnavailableException('All retry attempts exhausted')
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new GatewayTimeoutException(`Claude API timeout after ${ms}ms`)), ms),
    )
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
