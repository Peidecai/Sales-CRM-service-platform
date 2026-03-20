import request from './request'

/* ========== Types ========== */

export interface AiConfigVO {
  id: number
  module: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  isActive: boolean
  fallbackModel: string | null
  fallbackThreshold: number
  updatedById: number | null
  createdAt: string
  updatedAt: string
}

export interface AiPromptTemplateVO {
  id: number
  name: string
  module: string
  scene: string
  systemPrompt: string
  userPromptTemplate: string | null
  version: number
  isActive: boolean
  description: string | null
  createdById: number
  createdAt: string
  updatedAt: string
}

export interface AiPromptHistoryVO {
  id: number
  templateId: number
  version: number
  systemPrompt: string
  userPromptTemplate: string | null
  changeNote: string | null
  changedById: number
  createdAt: string
}

export interface PlaygroundResultVO {
  response: string
  model: string
  latencyMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface UsageStatItemVO {
  date: string
  module: string
  totalTokens: string
  requestCount: string
  estimatedCost: string
}

export interface UsageCostItemVO {
  module: string
  totalCost: string
  totalTokens: string
  requestCount: string
}

/* ========== API ========== */

export const aiConfigApi = {
  // Config
  getAllConfigs() {
    return request.get('/ai-config/config')
  },
  getConfig(module: string) {
    return request.get(`/ai-config/config/${module}`)
  },
  updateConfig(module: string, data: Partial<AiConfigVO>) {
    return request.put(`/ai-config/config/${module}`, data)
  },

  // Prompts
  getAllPrompts() {
    return request.get('/ai-config/prompts')
  },
  getPrompt(id: number) {
    return request.get(`/ai-config/prompts/${id}`)
  },
  createPrompt(data: {
    name: string
    module: string
    scene: string
    systemPrompt: string
    userPromptTemplate?: string | null
    description?: string | null
  }) {
    return request.post('/ai-config/prompts', data)
  },
  updatePrompt(
    id: number,
    data: {
      name?: string
      systemPrompt?: string
      userPromptTemplate?: string | null
      isActive?: boolean
      description?: string | null
      changeNote?: string
    },
  ) {
    return request.put(`/ai-config/prompts/${id}`, data)
  },
  deletePrompt(id: number) {
    return request.delete(`/ai-config/prompts/${id}`)
  },
  getPromptHistory(id: number) {
    return request.get(`/ai-config/prompts/${id}/history`)
  },
  rollbackPrompt(id: number, version?: number) {
    return request.post(`/ai-config/prompts/${id}/rollback`, { version })
  },

  // Playground
  testPrompt(data: { prompt: string; module?: string; systemPrompt?: string }) {
    return request.post('/ai-config/playground', data)
  },

  // Usage
  getUsageStats(params: {
    module?: string
    startDate?: string
    endDate?: string
    groupBy?: string
  }) {
    return request.get('/ai-config/usage', { params })
  },
  getUsageCost(params: { module?: string; startDate?: string; endDate?: string }) {
    return request.get('/ai-config/usage/cost', { params })
  },
}
