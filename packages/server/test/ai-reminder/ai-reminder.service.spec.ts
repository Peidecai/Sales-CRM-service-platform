import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { AiReminderService } from '../../src/modules/ai-reminder/ai-reminder.service'
import { AiReminder } from '../../src/modules/ai-reminder/entities/ai-reminder.entity'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { AiService } from '../../src/modules/ai/ai.service'
import { AiReminderFeedback, UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('AiReminderService', () => {
  let service: AiReminderService
  let reminderRepo: MockRepository
  let opportunityRepo: MockRepository
  let aiService: { chat: jest.Mock }

  const salesUser = { id: 1, role: UserRole.SALES }
  const adminUser = { id: 2, role: UserRole.ADMIN }

  beforeEach(async () => {
    reminderRepo = createMockRepository()
    opportunityRepo = createMockRepository()
    aiService = { chat: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReminderService,
        { provide: getRepositoryToken(AiReminder), useValue: reminderRepo },
        { provide: getRepositoryToken(Opportunity), useValue: opportunityRepo },
        { provide: AiService, useValue: aiService },
      ],
    }).compile()

    service = module.get(AiReminderService)
  })

  describe('getReminders', () => {
    it('should return paginated reminders for sales user (own only)', async () => {
      const qb = createMockQueryBuilder([{ id: 1 }], 1)
      reminderRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getReminders({}, salesUser)
      expect(result.list).toHaveLength(1)
      expect(qb.andWhere).toHaveBeenCalledWith('r.user_id = :userId', { userId: 1 })
    })

    it('should return all reminders for admin', async () => {
      const qb = createMockQueryBuilder([], 0)
      reminderRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getReminders({}, adminUser)
      // admin should NOT have user_id filter
      const calls = qb.andWhere.mock.calls.map((c: unknown[]) => c[0])
      expect(calls).not.toContain('r.user_id = :userId')
    })

    it('should filter by type', async () => {
      const qb = createMockQueryBuilder([], 0)
      reminderRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getReminders({ type: 'stagnant' as never }, salesUser)
      expect(qb.andWhere).toHaveBeenCalledWith('r.type = :type', { type: 'stagnant' })
    })
  })

  describe('getSummary', () => {
    it('should return unread counts by type', async () => {
      const qb = createMockQueryBuilder()
      reminderRepo.createQueryBuilder.mockReturnValue(qb)
      qb.getRawMany.mockResolvedValue([
        { type: 'stagnant', count: '3' },
        { type: 'next_action', count: '2' },
      ])

      const result = await service.getSummary(1)
      expect(result['stagnant']).toBe(3)
      expect(result['total']).toBe(5)
    })
  })

  describe('markRead', () => {
    it('should mark reminder as read', async () => {
      const reminder = { id: 1, userId: 1, isRead: false }
      reminderRepo.findOne.mockResolvedValue(reminder)
      reminderRepo.save.mockImplementation(async (r: Record<string, unknown>) => r)

      const result = await service.markRead(1, 1)
      expect(result.isRead).toBe(true)
    })

    it('should throw if not found', async () => {
      reminderRepo.findOne.mockResolvedValue(null)
      await expect(service.markRead(999, 1)).rejects.toThrow(NotFoundException)
    })
  })

  describe('markAllRead', () => {
    it('should update all unread reminders', async () => {
      reminderRepo.update.mockResolvedValue({ affected: 5 })
      await service.markAllRead(1)
      expect(reminderRepo.update).toHaveBeenCalledWith(
        { userId: 1, isRead: false },
        { isRead: true },
      )
    })
  })

  describe('submitFeedback', () => {
    it('should submit feedback', async () => {
      const reminder = { id: 1, userId: 1, feedback: null, feedbackAt: null }
      reminderRepo.findOne.mockResolvedValue(reminder)
      reminderRepo.save.mockImplementation(async (r: Record<string, unknown>) => r)

      const result = await service.submitFeedback(1, 1, { feedback: AiReminderFeedback.HELPFUL })
      expect(result.feedback).toBe(AiReminderFeedback.HELPFUL)
      expect(result.feedbackAt).toBeInstanceOf(Date)
    })

    it('should throw if reminder not found', async () => {
      reminderRepo.findOne.mockResolvedValue(null)
      await expect(
        service.submitFeedback(999, 1, { feedback: AiReminderFeedback.HELPFUL }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('generateNextActions', () => {
    it('should create next action reminder via AI', async () => {
      const opp = fixtures.opportunity()
      opportunityRepo.findOne.mockResolvedValue(opp)
      aiService.chat.mockResolvedValue(JSON.stringify({
        title: 'Follow up call',
        content: 'Schedule a demo',
        priority: 'high',
      }))
      reminderRepo.create.mockImplementation((d: Record<string, unknown>) => d)
      reminderRepo.save.mockImplementation(async (d: Record<string, unknown>) => ({ id: 1, ...d }))

      const result = await service.generateNextActions(1)
      expect(result).toBeTruthy()
      expect(result?.title).toBe('Follow up call')
    })

    it('should throw if opportunity not found', async () => {
      opportunityRepo.findOne.mockResolvedValue(null)
      await expect(service.generateNextActions(999)).rejects.toThrow(NotFoundException)
    })

    it('should return null on AI failure', async () => {
      const opp = fixtures.opportunity()
      opportunityRepo.findOne.mockResolvedValue(opp)
      aiService.chat.mockRejectedValue(new Error('fail'))

      const result = await service.generateNextActions(1)
      expect(result).toBeNull()
    })
  })
})
