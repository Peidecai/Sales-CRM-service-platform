import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AiPromptService } from '../../src/modules/ai-config/ai-prompt.service'
import { AiPromptTemplate } from '../../src/modules/ai-config/ai-prompt-template.entity'
import { AiPromptHistory } from '../../src/modules/ai-config/ai-prompt-history.entity'
import { createMockRepository } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('AiPromptService', () => {
  let service: AiPromptService
  let templateRepo: MockRepository
  let historyRepo: MockRepository

  beforeEach(async () => {
    templateRepo = createMockRepository()
    historyRepo = createMockRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPromptService,
        { provide: getRepositoryToken(AiPromptTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(AiPromptHistory), useValue: historyRepo },
      ],
    }).compile()

    service = module.get(AiPromptService)
  })

  const mockTemplate = {
    id: 1,
    name: 'Test Prompt',
    module: 'call_summary',
    scene: 'summarize',
    systemPrompt: 'You are a call summarizer.',
    userPromptTemplate: 'Summarize: {{transcript}}',
    version: 1,
    isActive: true,
    description: 'Test',
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  describe('findAll', () => {
    it('should return all templates', async () => {
      templateRepo.find.mockResolvedValue([mockTemplate])
      const result = await service.findAll()
      expect(result).toEqual([mockTemplate])
    })
  })

  describe('findOne', () => {
    it('should return template by id', async () => {
      templateRepo.findOne.mockResolvedValue(mockTemplate)
      const result = await service.findOne(1)
      expect(result).toEqual(mockTemplate)
    })

    it('should throw when not found', async () => {
      templateRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow()
    })
  })

  describe('getActivePrompt', () => {
    it('should find active prompt by module and scene', async () => {
      templateRepo.findOne.mockResolvedValue(mockTemplate)
      const result = await service.getActivePrompt('call_summary', 'summarize')
      expect(result).toEqual(mockTemplate)
    })

    it('should return null when no active prompt', async () => {
      templateRepo.findOne.mockResolvedValue(null)
      const result = await service.getActivePrompt('unknown', 'unknown')
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new template', async () => {
      templateRepo.create.mockReturnValue(mockTemplate)
      templateRepo.save.mockResolvedValue(mockTemplate)
      const result = await service.create({
        name: 'Test',
        module: 'call_summary',
        scene: 'summarize',
        systemPrompt: 'You are a call summarizer.',
      }, 1)
      expect(result).toEqual(mockTemplate)
    })
  })

  describe('update', () => {
    it('should save history and update template', async () => {
      templateRepo.findOne.mockResolvedValue({ ...mockTemplate })
      historyRepo.create.mockReturnValue({})
      historyRepo.save.mockResolvedValue({})
      templateRepo.save.mockImplementation(async (e) => e)

      const result = await service.update(1, {
        systemPrompt: 'Updated prompt',
        changeNote: 'Improved clarity',
      }, 2)

      expect(historyRepo.save).toHaveBeenCalled()
      expect(result.version).toBe(2)
      expect(result.systemPrompt).toBe('Updated prompt')
    })
  })

  describe('remove', () => {
    it('should soft remove template', async () => {
      templateRepo.findOne.mockResolvedValue(mockTemplate)
      templateRepo.softRemove.mockResolvedValue(mockTemplate)
      await service.remove(1)
      expect(templateRepo.softRemove).toHaveBeenCalledWith(mockTemplate)
    })
  })

  describe('getHistory', () => {
    it('should return history ordered by version desc', async () => {
      const histories = [{ id: 2, version: 2 }, { id: 1, version: 1 }]
      historyRepo.find.mockResolvedValue(histories)
      const result = await service.getHistory(1)
      expect(result).toEqual(histories)
    })
  })

  describe('rollback', () => {
    it('should rollback to specific version', async () => {
      const tpl = { ...mockTemplate }
      templateRepo.findOne.mockResolvedValue(tpl)
      historyRepo.findOne.mockResolvedValue({
        systemPrompt: 'Old prompt',
        userPromptTemplate: 'Old template',
      })
      templateRepo.save.mockImplementation(async (e) => e)

      const result = await service.rollback(1, 1)
      expect(result.systemPrompt).toBe('Old prompt')
      expect(result.version).toBe(2)
    })

    it('should throw when history not found', async () => {
      templateRepo.findOne.mockResolvedValue(mockTemplate)
      historyRepo.findOne.mockResolvedValue(null)
      await expect(service.rollback(1, 99)).rejects.toThrow()
    })
  })
})
