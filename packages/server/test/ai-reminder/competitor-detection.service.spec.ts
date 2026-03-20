import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CompetitorDetectionService } from '../../src/modules/ai-reminder/competitor-detection.service'
import { CompetitorMention } from '../../src/modules/ai-reminder/entities/competitor-mention.entity'
import { AiReminder } from '../../src/modules/ai-reminder/entities/ai-reminder.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { AiService } from '../../src/modules/ai/ai.service'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('CompetitorDetectionService', () => {
  let service: CompetitorDetectionService
  let mentionRepo: MockRepository
  let reminderRepo: MockRepository
  let callRecordRepo: MockRepository
  let aiService: { chat: jest.Mock }

  beforeEach(async () => {
    mentionRepo = createMockRepository()
    reminderRepo = createMockRepository()
    callRecordRepo = createMockRepository()
    aiService = { chat: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitorDetectionService,
        { provide: getRepositoryToken(CompetitorMention), useValue: mentionRepo },
        { provide: getRepositoryToken(AiReminder), useValue: reminderRepo },
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: AiService, useValue: aiService },
      ],
    }).compile()

    service = module.get(CompetitorDetectionService)
  })

  describe('detectFromCallRecord', () => {
    it('should return empty if call record not found', async () => {
      callRecordRepo.findOne.mockResolvedValue(null)
      const result = await service.detectFromCallRecord(999)
      expect(result).toEqual([])
    })

    it('should return empty if no text content', async () => {
      callRecordRepo.findOne.mockResolvedValue(
        fixtures.callRecord({ aiSummary: null, notes: null }),
      )
      const result = await service.detectFromCallRecord(1)
      expect(result).toEqual([])
    })

    it('should detect competitors from call record', async () => {
      const cr = fixtures.callRecord({ aiSummary: 'Client mentioned competitor X' })
      callRecordRepo.findOne.mockResolvedValue(cr)
      aiService.chat.mockResolvedValue(JSON.stringify([
        { name: 'CompX', context: 'mentioned competitor X', sentiment: 'negative' },
      ]))
      mentionRepo.create.mockImplementation((d: Record<string, unknown>) => d)
      mentionRepo.save.mockImplementation(async (d: Record<string, unknown>) => ({ id: 1, ...d }))
      reminderRepo.create.mockImplementation((d: Record<string, unknown>) => d)
      reminderRepo.save.mockImplementation(async (d: Record<string, unknown>) => ({ id: 1, ...d }))

      const result = await service.detectFromCallRecord(1)
      expect(result).toHaveLength(1)
      expect(result[0].competitorName).toBe('CompX')
      expect(reminderRepo.save).toHaveBeenCalled()
    })

    it('should return empty on AI failure', async () => {
      const cr = fixtures.callRecord({ aiSummary: 'some text' })
      callRecordRepo.findOne.mockResolvedValue(cr)
      aiService.chat.mockRejectedValue(new Error('AI fail'))

      const result = await service.detectFromCallRecord(1)
      expect(result).toEqual([])
    })
  })

  describe('getCompetitorReport', () => {
    it('should return paginated mentions', async () => {
      const qb = createMockQueryBuilder([{ id: 1 }], 1)
      mentionRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getCompetitorReport({ opportunityId: 1 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('getTopCompetitors', () => {
    it('should return top competitors by count', async () => {
      const qb = createMockQueryBuilder()
      mentionRepo.createQueryBuilder.mockReturnValue(qb)
      qb.getRawMany.mockResolvedValue([
        { competitorName: 'CompA', count: '5' },
        { competitorName: 'CompB', count: '3' },
      ])

      const result = await service.getTopCompetitors(10)
      expect(result).toHaveLength(2)
      expect(result[0].count).toBe(5)
    })
  })
})
