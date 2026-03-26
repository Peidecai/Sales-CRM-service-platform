import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AiUsageService } from '../../src/modules/ai-config/ai-usage.service'
import { AiUsageLog } from '../../src/modules/ai-config/ai-usage-log.entity'
import { createMockRepository, createMockQueryBuilder } from '../test-utils'
import type { MockRepository, MockQueryBuilder } from '../test-utils'

describe('AiUsageService', () => {
  let service: AiUsageService
  let repo: MockRepository
  let qb: MockQueryBuilder

  beforeEach(async () => {
    repo = createMockRepository()
    qb = createMockQueryBuilder()

    repo.createQueryBuilder.mockReturnValue(qb)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiUsageService,
        { provide: getRepositoryToken(AiUsageLog), useValue: repo },
      ],
    }).compile()

    service = module.get(AiUsageService)
  })

  describe('logUsage', () => {
    it('should create and save usage log', async () => {
      const data = {
        module: 'chat',
        model: 'gpt-4o-mini',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        latencyMs: 500,
        isSuccess: true,
      }
      repo.create.mockReturnValue(data)
      repo.save.mockResolvedValue({ id: 1, ...data })

      const result = await service.logUsage(data)
      expect(result.id).toBe(1)
      expect(repo.create).toHaveBeenCalled()
    })

    it('should handle error message', async () => {
      const data = {
        module: 'chat',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 0,
        totalTokens: 100,
        latencyMs: 3000,
        isSuccess: false,
        errorMessage: 'Rate limited',
      }
      repo.create.mockReturnValue(data)
      repo.save.mockResolvedValue({ id: 2, ...data })

      const result = await service.logUsage(data)
      expect(result.isSuccess).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should query with day grouping by default', async () => {
      qb.getRawMany.mockResolvedValue([{ date: '2025-01-01', module: 'chat', totalTokens: '1000' }])
      const result = await service.getStatistics({ groupBy: 'day' })
      expect(result).toHaveLength(1)
      expect(qb.select).toHaveBeenCalled()
      expect(qb.groupBy).toHaveBeenCalled()
    })

    it('should filter by module', async () => {
      qb.getRawMany.mockResolvedValue([])
      await service.getStatistics({ module: 'chat', groupBy: 'day' })
      expect(qb.andWhere).toHaveBeenCalledWith('log.module = :module', { module: 'chat' })
    })

    it('should filter by date range', async () => {
      qb.getRawMany.mockResolvedValue([])
      await service.getStatistics({ startDate: '2025-01-01', endDate: '2025-01-31' })
      expect(qb.andWhere).toHaveBeenCalledTimes(2)
    })

    it('should support week grouping', async () => {
      qb.getRawMany.mockResolvedValue([])
      await service.getStatistics({ groupBy: 'week' })
      expect(qb.select).toHaveBeenCalled()
    })

    it('should support month grouping', async () => {
      qb.getRawMany.mockResolvedValue([])
      await service.getStatistics({ groupBy: 'month' })
      expect(qb.select).toHaveBeenCalled()
    })
  })

  describe('getCostEstimate', () => {
    it('should return cost by module', async () => {
      qb.getRawMany.mockResolvedValue([
        { module: 'chat', totalCost: '0.050000', totalTokens: '25000', requestCount: '10' },
      ])
      const result = await service.getCostEstimate({})
      expect(result).toHaveLength(1)
      expect(result[0].module).toBe('chat')
    })

    it('should filter by module', async () => {
      qb.getRawMany.mockResolvedValue([])
      await service.getCostEstimate({ module: 'rag' })
      expect(qb.andWhere).toHaveBeenCalledWith('log.module = :module', { module: 'rag' })
    })

    it('should filter by date range', async () => {
      qb.getRawMany.mockResolvedValue([])
      await service.getCostEstimate({ startDate: '2025-01-01', endDate: '2025-12-31' })
      expect(qb.andWhere).toHaveBeenCalledTimes(2)
    })
  })
})
