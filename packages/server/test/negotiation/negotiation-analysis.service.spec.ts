import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { getQueueToken } from '@nestjs/bull'
import { NotFoundException } from '@nestjs/common'
import { NegotiationAnalysisService } from '../../src/modules/negotiation/negotiation-analysis.service'
import { NegotiationAnalysis } from '../../src/modules/negotiation/entities/negotiation-analysis.entity'
import { CallRecordService } from '../../src/modules/call-record/call-record.service'
import { AiService } from '../../src/modules/ai/ai.service'
import { NegotiationStatus } from '@crm/shared'
import { createMockRepository, createMockQueryBuilder, fixtures } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('NegotiationAnalysisService', () => {
  let service: NegotiationAnalysisService
  let repo: MockRepository<NegotiationAnalysis>
  let mockQueue: { add: jest.Mock }
  let mockCallRecordService: { findOne: jest.Mock }
  let mockAiService: { chat: jest.Mock }

  beforeEach(async () => {
    repo = createMockRepository<NegotiationAnalysis>()
    mockQueue = { add: jest.fn() }
    mockCallRecordService = { findOne: jest.fn() }
    mockAiService = { chat: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationAnalysisService,
        { provide: getRepositoryToken(NegotiationAnalysis), useValue: repo },
        { provide: getQueueToken('negotiation-analysis'), useValue: mockQueue },
        { provide: CallRecordService, useValue: mockCallRecordService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile()

    service = module.get(NegotiationAnalysisService)
  })

  describe('triggerAnalysis', () => {
    it('should create analysis and add to queue', async () => {
      const callRecord = fixtures.callRecord({ customerId: 5 })
      mockCallRecordService.findOne.mockResolvedValue(callRecord)
      repo.findOne.mockResolvedValue(null)
      const saved = { id: 10, callRecordId: 1, userId: 1, status: NegotiationStatus.PENDING }
      repo.create.mockReturnValue(saved)
      repo.save.mockResolvedValue(saved)

      const result = await service.triggerAnalysis(1, 1)

      expect(repo.create).toHaveBeenCalledWith({
        callRecordId: 1,
        customerId: 5,
        userId: 1,
        status: NegotiationStatus.PENDING,
      })
      expect(mockQueue.add).toHaveBeenCalledWith('analyze', { analysisId: 10 })
      expect(result).toEqual(saved)
    })

    it('should return existing analysis if not failed', async () => {
      const callRecord = fixtures.callRecord()
      mockCallRecordService.findOne.mockResolvedValue(callRecord)
      const existing = { id: 5, status: NegotiationStatus.COMPLETED }
      repo.findOne.mockResolvedValue(existing)

      const result = await service.triggerAnalysis(1, 1)

      expect(result).toEqual(existing)
      expect(mockQueue.add).not.toHaveBeenCalled()
    })

    it('should re-trigger if existing analysis failed', async () => {
      const callRecord = fixtures.callRecord()
      mockCallRecordService.findOne.mockResolvedValue(callRecord)
      const existing = { id: 5, status: NegotiationStatus.FAILED }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockResolvedValue({ ...existing, status: NegotiationStatus.PENDING })

      await service.triggerAnalysis(1, 1)

      expect(mockQueue.add).toHaveBeenCalledWith('analyze', { analysisId: 5 })
    })
  })

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const items = [{ id: 1 }, { id: 2 }]
      const qb = createMockQueryBuilder(items, 2)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 })

      expect(result).toEqual({ list: items, total: 2, page: 1, pageSize: 20 })
    })

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 10, status: 'completed' })

      expect(qb.andWhere).toHaveBeenCalledWith('na.status = :status', { status: 'completed' })
    })

    it('should apply outcome filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 10, outcome: 'won' })

      expect(qb.andWhere).toHaveBeenCalledWith('na.outcome = :outcome', { outcome: 'won' })
    })

    it('should apply date filters', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 10, startDate: '2025-01-01', endDate: '2025-12-31' })

      expect(qb.andWhere).toHaveBeenCalledWith('na.created_at >= :startDate', { startDate: '2025-01-01' })
      expect(qb.andWhere).toHaveBeenCalledWith('na.created_at <= :endDate', { endDate: '2025-12-31' })
    })
  })

  describe('findOne', () => {
    it('should return analysis by id', async () => {
      const analysis = { id: 1, status: NegotiationStatus.COMPLETED }
      repo.findOne.mockResolvedValue(analysis)

      const result = await service.findOne(1)

      expect(result).toEqual(analysis)
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should soft remove analysis', async () => {
      const analysis = { id: 1 }
      repo.findOne.mockResolvedValue(analysis)
      repo.softRemove.mockResolvedValue(analysis)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(analysis)
    })
  })

  describe('generateReNegotiationAdvice', () => {
    it('should call AI and save advice', async () => {
      const analysis = {
        id: 1,
        status: NegotiationStatus.COMPLETED,
        overallScore: 75,
        strategy: 'collaborative',
        outcome: 'won',
        summary: 'Good negotiation',
        strengths: ['rapport'],
        weaknesses: ['pricing'],
        concessions: [],
        reNegotiationAdvice: null,
      }
      repo.findOne.mockResolvedValue(analysis)
      mockAiService.chat.mockResolvedValue('AI generated advice here')
      repo.save.mockImplementation(async (e: unknown) => e)

      const result = await service.generateReNegotiationAdvice(1)

      expect(mockAiService.chat).toHaveBeenCalled()
      expect(result.reNegotiationAdvice).toBe('AI generated advice here')
    })

    it('should throw if analysis not completed', async () => {
      const analysis = { id: 1, status: NegotiationStatus.PENDING }
      repo.findOne.mockResolvedValue(analysis)

      await expect(service.generateReNegotiationAdvice(1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({
        avgScore: '72.5',
        totalAnalyses: '10',
        wonCount: '6',
        avgConcessions: '3.2',
      })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getDashboard({})

      expect(result.avgScore).toBeCloseTo(72.5)
      expect(result.totalAnalyses).toBe(10)
      expect(result.winRate).toBeCloseTo(0.6)
    })
  })

  describe('getPatterns', () => {
    it('should return won vs lost patterns', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ avgScore: '80', count: '5' })
      qb.getRawMany.mockResolvedValue([{ strategy: 'collaborative', count: '3' }])
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getPatterns({})

      expect(result.won).toBeDefined()
      expect(result.lost).toBeDefined()
    })
  })

  describe('exportCsv', () => {
    it('should return CSV string', async () => {
      const records = [
        {
          id: 1,
          callRecordId: 10,
          customerId: 5,
          userId: 1,
          status: NegotiationStatus.COMPLETED,
          overallScore: 80,
          strategy: 'collaborative',
          outcome: 'won',
          summary: 'Test summary',
          createdAt: new Date('2025-01-01'),
        },
      ]
      const qb = createMockQueryBuilder(records)
      repo.createQueryBuilder.mockReturnValue(qb)
      qb.getMany.mockResolvedValue(records)

      const csv = await service.exportCsv({})

      expect(csv).toContain('ID,通话记录ID')
      expect(csv).toContain('1,10,5,1,completed,80,collaborative,won')
    })
  })
})
