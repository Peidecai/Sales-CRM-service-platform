import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { NotFoundException } from '@nestjs/common'
import { OpportunityScoringService } from '../../src/modules/ai-reminder/opportunity-scoring.service'
import { OpportunityScore } from '../../src/modules/ai-reminder/entities/opportunity-score.entity'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { AiService } from '../../src/modules/ai/ai.service'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('OpportunityScoringService', () => {
  let service: OpportunityScoringService
  let scoreRepo: MockRepository
  let opportunityRepo: MockRepository
  let customerRepo: MockRepository
  let aiService: { chat: jest.Mock }
  let queue: { add: jest.Mock }

  beforeEach(async () => {
    scoreRepo = createMockRepository()
    opportunityRepo = createMockRepository()
    customerRepo = createMockRepository()
    aiService = { chat: jest.fn() }
    queue = { add: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityScoringService,
        { provide: getRepositoryToken(OpportunityScore), useValue: scoreRepo },
        { provide: getRepositoryToken(Opportunity), useValue: opportunityRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: AiService, useValue: aiService },
        { provide: getQueueToken('ai-scoring'), useValue: queue },
      ],
    }).compile()

    service = module.get(OpportunityScoringService)
  })

  describe('scoreOpportunity', () => {
    it('should throw NotFoundException if opportunity not found', async () => {
      opportunityRepo.findOne.mockResolvedValue(null)
      await expect(service.scoreOpportunity(999)).rejects.toThrow(NotFoundException)
    })

    it('should score opportunity with AI response', async () => {
      const opp = fixtures.opportunity()
      const cust = fixtures.customer()
      opportunityRepo.findOne.mockResolvedValue(opp)
      customerRepo.findOne.mockResolvedValue(cust)
      aiService.chat.mockResolvedValue(JSON.stringify({
        customerFit: 80,
        engagementLevel: 70,
        stageProgress: 60,
        sentimentTrend: 75,
        competitorRisk: 85,
        overall: 74,
        reasoning: 'Good prospect',
      }))
      scoreRepo.create.mockImplementation((data: Record<string, unknown>) => data)
      scoreRepo.save.mockImplementation(async (data: Record<string, unknown>) => ({ id: 1, ...data }))

      const result = await service.scoreOpportunity(1)
      expect(result.score).toBe(74)
      expect(result.dimensions.customerFit).toBe(80)
      expect(aiService.chat).toHaveBeenCalled()
    })

    it('should use defaults when AI fails', async () => {
      const opp = fixtures.opportunity()
      opportunityRepo.findOne.mockResolvedValue(opp)
      customerRepo.findOne.mockResolvedValue(null)
      aiService.chat.mockRejectedValue(new Error('API down'))
      scoreRepo.create.mockImplementation((data: Record<string, unknown>) => data)
      scoreRepo.save.mockImplementation(async (data: Record<string, unknown>) => ({ id: 1, ...data }))

      const result = await service.scoreOpportunity(1)
      expect(result.score).toBe(50)
      expect(result.dimensions.customerFit).toBe(50)
    })

    it('should handle malformed AI JSON gracefully', async () => {
      const opp = fixtures.opportunity()
      opportunityRepo.findOne.mockResolvedValue(opp)
      customerRepo.findOne.mockResolvedValue(null)
      aiService.chat.mockResolvedValue('not json')
      scoreRepo.create.mockImplementation((data: Record<string, unknown>) => data)
      scoreRepo.save.mockImplementation(async (data: Record<string, unknown>) => ({ id: 1, ...data }))

      const result = await service.scoreOpportunity(1)
      expect(result.score).toBe(50) // fallback
    })
  })

  describe('getScoreHistory', () => {
    it('should return paginated score history', async () => {
      const mockScores = [{ id: 1, score: 80 }]
      const qb = createMockQueryBuilder(mockScores, 1)
      scoreRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getScoreHistory({ opportunityId: 1 })
      expect(result.list).toEqual(mockScores)
      expect(result.total).toBe(1)
    })

    it('should use default pagination', async () => {
      const qb = createMockQueryBuilder([], 0)
      scoreRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getScoreHistory({})
      expect(result.list).toEqual([])
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })
  })

  describe('getScoreDistribution', () => {
    it('should return distribution counts', async () => {
      const qb = createMockQueryBuilder()
      scoreRepo.createQueryBuilder.mockReturnValue(qb)
      qb.getRawOne.mockResolvedValue({ high: '5', medium: '10', low: '3' })

      const result = await service.getScoreDistribution()
      expect(result.high).toBe(5)
      expect(result.medium).toBe(10)
    })

    it('should filter by userId', async () => {
      const qb = createMockQueryBuilder()
      scoreRepo.createQueryBuilder.mockReturnValue(qb)
      qb.getRawOne.mockResolvedValue({ high: '2', medium: '3', low: '1' })

      const result = await service.getScoreDistribution(1)
      expect(qb.andWhere).toHaveBeenCalledWith('o.assigned_user_id = :userId', { userId: 1 })
      expect(result.high).toBe(2)
    })
  })

  describe('enqueueScoring', () => {
    it('should add job to queue', async () => {
      await service.enqueueScoring(42)
      expect(queue.add).toHaveBeenCalledWith('score', { opportunityId: 42 })
    })
  })

  describe('batchScore', () => {
    it('should enqueue all active opportunities', async () => {
      const qb = createMockQueryBuilder([{ id: 1 }, { id: 2 }])
      opportunityRepo.createQueryBuilder.mockReturnValue(qb)
      opportunityRepo.find.mockResolvedValue([])
      qb.getMany.mockResolvedValue([{ id: 1 }, { id: 2 }])

      await service.batchScore()
      expect(queue.add).toHaveBeenCalledTimes(2)
    })
  })
})
