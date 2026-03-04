import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import OpenAI from 'openai'
import { aiConfig, AiConfig } from './ai.config'

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name)
  private client!: OpenAI
  private config!: AiConfig

  onModuleInit() {
    this.config = aiConfig()
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    })

    if (!this.config.apiKey || this.config.apiKey === 'sk-your-dashscope-api-key') {
      this.logger.warn(
        'DASHSCOPE_API_KEY is not set — AI features will fail. Set it in .env to enable AI.',
      )
    } else {
      this.logger.log(`AI service initialized (model: ${this.config.chatModel})`)
    }
  }

  /**
   * Chat completion via DashScope OpenAI-compatible API.
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    })

    return response.choices[0]?.message?.content ?? ''
  }

  /**
   * Generate embeddings for a list of text chunks.
   * Returns an array of float arrays.
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const response = await this.client.embeddings.create({
      model: this.config.embeddingModel,
      input: texts,
    })

    // Sort by index in case the API returns out of order
    return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding)
  }

  /**
   * Generate a single embedding vector.
   */
  async embedSingle(text: string): Promise<number[]> {
    const [vector] = await this.embed([text])
    return vector
  }
}
