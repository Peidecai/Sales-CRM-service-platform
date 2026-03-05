import { AiService } from '../../src/modules/ai/ai.service'

/**
 * Minimal mock for the OpenAI client used inside AiService.
 */
const mockCreate = jest.fn()
const mockEmbedCreate = jest.fn()

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
      embeddings: { create: mockEmbedCreate },
    })),
  }
})

describe('AiService', () => {
  let service: AiService

  beforeEach(() => {
    jest.clearAllMocks()

    // Set env so config won't warn
    process.env.DASHSCOPE_API_KEY = 'sk-test-key'

    service = new AiService()
    service.onModuleInit()
  })

  afterEach(() => {
    delete process.env.DASHSCOPE_API_KEY
    jest.restoreAllMocks()
  })

  /* ---------- chat ---------- */
  describe('chat', () => {
    it('should call OpenAI chat completion and return content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'AI response' } }],
      })

      const result = await service.chat('You are a helper', 'Hello')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helper' },
            { role: 'user', content: 'Hello' },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      )
      expect(result).toBe('AI response')
    })

    it('should use custom temperature and maxTokens', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Custom' } }],
      })

      await service.chat('sys', 'msg', { temperature: 0.3, maxTokens: 512 })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
          max_tokens: 512,
        }),
      )
    })

    it('should return empty string when no content in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      })

      const result = await service.chat('sys', 'msg')
      expect(result).toBe('')
    })

    it('should return empty string when choices array is empty', async () => {
      mockCreate.mockResolvedValue({ choices: [] })

      const result = await service.chat('sys', 'msg')
      expect(result).toBe('')
    })
  })

  /* ---------- embed ---------- */
  describe('embed', () => {
    it('should generate embeddings for text array', async () => {
      const mockEmbeddings = [
        { index: 0, embedding: [0.1, 0.2, 0.3] },
        { index: 1, embedding: [0.4, 0.5, 0.6] },
      ]
      mockEmbedCreate.mockResolvedValue({ data: mockEmbeddings })

      const result = await service.embed(['text1', 'text2'])

      expect(mockEmbedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: ['text1', 'text2'],
        }),
      )
      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ])
    })

    it('should return empty array for empty input', async () => {
      const result = await service.embed([])

      expect(result).toEqual([])
      expect(mockEmbedCreate).not.toHaveBeenCalled()
    })

    it('should sort results by index', async () => {
      const mockEmbeddings = [
        { index: 1, embedding: [0.4, 0.5] },
        { index: 0, embedding: [0.1, 0.2] },
      ]
      mockEmbedCreate.mockResolvedValue({ data: mockEmbeddings })

      const result = await service.embed(['a', 'b'])

      expect(result[0]).toEqual([0.1, 0.2])
      expect(result[1]).toEqual([0.4, 0.5])
    })
  })

  /* ---------- embedSingle ---------- */
  describe('embedSingle', () => {
    it('should return a single embedding vector', async () => {
      mockEmbedCreate.mockResolvedValue({
        data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
      })

      const result = await service.embedSingle('hello')

      expect(result).toEqual([0.1, 0.2, 0.3])
    })
  })

  /* ---------- onModuleInit ---------- */
  describe('onModuleInit', () => {
    it('should warn when API key is not set', () => {
      delete process.env.DASHSCOPE_API_KEY

      const svc = new AiService()
      const warnSpy = jest.spyOn((svc as any).logger, 'warn')
      svc.onModuleInit()

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DASHSCOPE_API_KEY'))
    })

    it('should warn for placeholder API key', () => {
      process.env.DASHSCOPE_API_KEY = 'sk-your-dashscope-api-key'
      const svc = new AiService()
      const warnSpy = jest.spyOn((svc as any).logger, 'warn')
      svc.onModuleInit()

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DASHSCOPE_API_KEY'))
    })
  })
})
