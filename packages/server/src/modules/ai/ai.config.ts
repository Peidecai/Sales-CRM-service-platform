/**
 * AI / DashScope configuration factory.
 * Reads env variables and provides typed config.
 */
export interface AiConfig {
  apiKey: string
  baseUrl: string
  chatModel: string
  embeddingModel: string
  vectorDbPath: string
}

export const aiConfig = (): AiConfig => ({
  apiKey: process.env.DASHSCOPE_API_KEY || '',
  baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  chatModel: process.env.DASHSCOPE_CHAT_MODEL || 'qwen-turbo',
  embeddingModel: process.env.DASHSCOPE_EMBEDDING_MODEL || 'text-embedding-v3',
  vectorDbPath: process.env.VECTOR_DB_PATH || './data/vectors.db',
})
