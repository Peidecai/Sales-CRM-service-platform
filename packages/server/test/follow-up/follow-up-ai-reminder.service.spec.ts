import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { FollowUpAiReminderService } from '../../src/modules/follow-up/follow-up-ai-reminder.service'
import { FollowUp } from '../../src/modules/follow-up/follow-up.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { ReminderSetting } from '../../src/modules/follow-up/entities/reminder-setting.entity'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { AiService } from '../../src/modules/ai/ai.service'
import {
  createMockRepository,
  createMockQueryBuilder,
  type MockRepository,
  type MockQueryBuilder,
} from '../test-utils'

describe('FollowUpAiReminderService', () => {
  let service: FollowUpAiReminderService
  let followUpRepo: MockRepository
  let customerRepo: MockRepository
  let reminderSettingRepo: MockRepository
  let notificationService: { notifyUser: jest.Mock; notify: jest.Mock }
  let aiService: { chat: jest.Mock }

  beforeEach(async () => {
    followUpRepo = createMockRepository()
    customerRepo = createMockRepository()
    reminderSettingRepo = createMockRepository()
    notificationService = { notifyUser: jest.fn(), notify: jest.fn() }
    aiService = { chat: jest.fn().mockResolvedValue('AI建议：请及时跟进客户') }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpAiReminderService,
        { provide: getRepositoryToken(FollowUp), useValue: followUpRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(ReminderSetting), useValue: reminderSettingRepo },
        { provide: NotificationService, useValue: notificationService },
        { provide: AiService, useValue: aiService },
      ],
    }).compile()

    service = module.get(FollowUpAiReminderService)
  })

  describe('getReminderSettings', () => {
    it('should return user-specific setting when exists', async () => {
      const setting = { userId: 5, defaultReminderTime: '08:30', reminderEnabled: true }
      reminderSettingRepo.findOne.mockResolvedValue(setting)

      const result = await service.getReminderSettings(5)
      expect(result).toEqual(setting)
      expect(reminderSettingRepo.findOne).toHaveBeenCalledWith({ where: { userId: 5 } })
    })

    it('should fall back to global default (userId=0)', async () => {
      const globalSetting = { userId: 0, defaultReminderTime: '09:00' }
      reminderSettingRepo.findOne
        .mockResolvedValueOnce(null) // user-specific not found
        .mockResolvedValueOnce(globalSetting) // global default

      const result = await service.getReminderSettings(5)
      expect(result).toEqual(globalSetting)
    })

    it('should return unsaved default when no settings exist', async () => {
      reminderSettingRepo.findOne.mockResolvedValue(null)
      reminderSettingRepo.create.mockImplementation((data: unknown) => data)

      const result = await service.getReminderSettings(5)
      expect(result).toEqual(
        expect.objectContaining({
          userId: 5,
          defaultReminderTime: '09:00',
          reminderEnabled: true,
          aiReminderEnabled: true,
          inactiveDaysThreshold: 3,
        }),
      )
    })
  })

  describe('updateReminderSettings', () => {
    it('should create new setting when none exists', async () => {
      reminderSettingRepo.findOne.mockResolvedValue(null)
      reminderSettingRepo.create.mockImplementation((data: unknown) => data)
      reminderSettingRepo.save.mockImplementation(async (data: unknown) => data)

      const result = await service.updateReminderSettings(5, { reminderEnabled: false })
      expect(reminderSettingRepo.create).toHaveBeenCalledWith({ userId: 5, reminderEnabled: false })
      expect(reminderSettingRepo.save).toHaveBeenCalled()
    })

    it('should update existing setting', async () => {
      const existing = { userId: 5, defaultReminderTime: '09:00', reminderEnabled: true }
      reminderSettingRepo.findOne.mockResolvedValue(existing)
      reminderSettingRepo.save.mockImplementation(async (data: unknown) => data)

      await service.updateReminderSettings(5, { defaultReminderTime: '08:00' })
      expect(reminderSettingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ defaultReminderTime: '08:00' }),
      )
    })
  })

  describe('handleAiReminder', () => {
    it('should skip users with AI reminder disabled', async () => {
      reminderSettingRepo.find.mockResolvedValue([
        { userId: 0, aiReminderEnabled: true, inactiveDaysThreshold: 3 },
        { userId: 1, aiReminderEnabled: false, inactiveDaysThreshold: 3 },
      ])

      const customerQb = createMockQueryBuilder([])
      customerRepo.createQueryBuilder.mockReturnValue(customerQb)
      customerQb.getRawMany.mockResolvedValue([{ userId: 1 }])

      await service.handleAiReminder()
      expect(notificationService.notifyUser).not.toHaveBeenCalled()
    })

    it('should send notification when inactive customers found', async () => {
      reminderSettingRepo.find.mockResolvedValue([
        { userId: 0, aiReminderEnabled: true, inactiveDaysThreshold: 3 },
      ])

      // Customer query returns one user
      const customerQb = createMockQueryBuilder([])
      customerRepo.createQueryBuilder.mockReturnValue(customerQb)
      customerQb.getRawMany.mockResolvedValue([{ userId: 1 }])

      // The per-user customer query finds inactive customers
      customerQb.getMany.mockResolvedValue([
        { id: 10, name: '客户A', company: '公司A', status: 'potential', updatedAt: new Date() },
      ])

      await service.handleAiReminder()
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          actorName: 'AI 智能提醒',
          data: expect.objectContaining({ isAiReminder: true }),
        }),
      )
    })

    it('should use fallback message when AI call fails', async () => {
      reminderSettingRepo.find.mockResolvedValue([
        { userId: 0, aiReminderEnabled: true, inactiveDaysThreshold: 3 },
      ])

      const customerQb = createMockQueryBuilder([])
      customerRepo.createQueryBuilder.mockReturnValue(customerQb)
      customerQb.getRawMany.mockResolvedValue([{ userId: 1 }])
      customerQb.getMany.mockResolvedValue([
        { id: 10, name: '客户A', company: '公司A', status: 'potential', updatedAt: new Date() },
      ])

      aiService.chat.mockRejectedValue(new Error('API error'))

      await service.handleAiReminder()
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          message: expect.stringContaining('客户A'),
        }),
      )
    })

    it('should not send notification when no inactive customers', async () => {
      reminderSettingRepo.find.mockResolvedValue([
        { userId: 0, aiReminderEnabled: true, inactiveDaysThreshold: 3 },
      ])

      const customerQb = createMockQueryBuilder([])
      customerRepo.createQueryBuilder.mockReturnValue(customerQb)
      customerQb.getRawMany.mockResolvedValue([{ userId: 1 }])
      customerQb.getMany.mockResolvedValue([])

      await service.handleAiReminder()
      expect(notificationService.notifyUser).not.toHaveBeenCalled()
    })

    it('should handle empty user list gracefully', async () => {
      reminderSettingRepo.find.mockResolvedValue([])

      const customerQb = createMockQueryBuilder([])
      customerRepo.createQueryBuilder.mockReturnValue(customerQb)
      customerQb.getRawMany.mockResolvedValue([])

      await service.handleAiReminder()
      expect(notificationService.notifyUser).not.toHaveBeenCalled()
    })
  })
})
