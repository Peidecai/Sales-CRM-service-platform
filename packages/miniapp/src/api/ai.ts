/**
 * AI API — chat assistant
 */
import { http } from './request'
import type { ApiResponse } from '@crm/shared'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiChatResponse {
  reply: string
}

export const aiApi = {
  chat(message: string, history: AiChatMessage[] = []): Promise<ApiResponse<AiChatResponse>> {
    return http.post('/ai/chat', { message, history } as unknown as Record<string, unknown>)
  },
}
