import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { RedisService } from '../../src/common/redis'
import { AiConfigService } from '../../src/modules/ai-config/ai-config.service'
import { AiConfig } from '../../src/modules/ai-config/ai-config.entity'
import { createMockRepository, createMockRedisService } from '../test-utils'
import type { MockRepository, MockRedisService } from '../test-utils'

describe('AiConfigService', () => {
  let service: AiConfigService
  let repo: MockRepository
  let redis: MockRedisService

  beforeEach(async () => {
    repo = createMockRepository()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConfigService,
        { provide: getRepositoryToken(AiConfig), useValue: repo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get(AiConfigService)
  })

  const mockConfig = {
    id: 1,
    module: 'default',
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    isActive: true,
    fallbackModel: null,
    fallbackThreshold: 3,
    updatedById: null,
  }

  describe('getAllConfigs', () => {
    it('should return all configs', async () => {
      repo.find.mockResolvedValue([mockConfig])
      const result = await service.getAllConfigs()
      expect(result).toEqual([mockConfig])
      expect(repo.find).toHaveBeenCalledWith({ order: { module: 'ASC' } })
    })
  })

  describe('getConfig', () => {
    it('should return cached config', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify(mockConfig))
      const result = await service.getConfig('default')
      expect(result).toEqual(mockConfig)
      expect(repo.findOne).not.toHaveBeenCalled()
    })

    it('should query DB on cache miss', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(mockConfig)
      const result = await service.getConfig('default')
      expect(result).toEqual(mockConfig)
      expect(redis.set).toHaveBeenCalled()
    })

    it('should fallback to default config', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockConfig)
      const result = await service.getConfig('unknown_module')
      expect(result).toEqual(mockConfig)
    })

    it('should throw when no config found', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.findOne.mockResolvedValue(null)
      await expect(service.getConfig('unknown')).rejects.toThrow()
    })
  })

  describe('updateConfig', () => {
    it('should update and clear cache', async () => {
      const existing = { ...mockConfig }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockResolvedValue({ ...existing, temperature: 0.9, updatedById: 1 })

      const result = await service.updateConfig('default', { temperature: 0.9 }, 1)
      expect(result.temperature).toBe(0.9)
      expect(redis.del).toHaveBeenCalledWith('ai:config:default')
    })

    it('should throw when config not found', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.updateConfig('missing', { temperature: 0.5 }, 1)).rejects.toThrow()
    })

    it('should update multiple fields', async () => {
      const existing = { ...mockConfig }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockImplementation(async (e) => e)

      await service.updateConfig('default', {
        provider: 'anthropic',
        model: 'claude-3',
        temperature: 0.5,
        maxTokens: 4000,
      }, 2)

      expect(repo.save).toHaveBeenCalled()
    })

    it('should set updatedById', async () => {
      const existing = { ...mockConfig }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockImplementation(async (e) => e)

      await service.updateConfig('default', { isActive: false }, 42)
      expect(existing.updatedById).toBe(42)
    })

    it('should update isActive flag', async () => {
      const existing = { ...mockConfig }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockImplementation(async (e) => e)

      await service.updateConfig('default', { isActive: false }, 1)
      expect(existing.isActive).toBe(false)
    })

    it('should update fallback settings', async () => {
      const existing = { ...mockConfig }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockImplementation(async (e) => e)

      await service.updateConfig('default', { fallbackModel: 'gpt-3.5', fallbackThreshold: 5 }, 1)
      expect(existing.fallbackModel).toBe('gpt-3.5')
      expect(existing.fallbackThreshold).toBe(5)
    })
  })
})
