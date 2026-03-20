import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FollowUp } from './follow-up.entity'
import { Customer } from '../customer/customer.entity'
import { ReminderSetting } from './entities/reminder-setting.entity'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../notification/notification.types'
import { AiService } from '../ai/ai.service'

/** Max concurrent AI calls to avoid overloading */
const AI_CONCURRENCY = 5

@Injectable()
export class FollowUpAiReminderService {
  private readonly logger = new Logger(FollowUpAiReminderService.name)

  constructor(
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ReminderSetting)
    private readonly reminderSettingRepo: Repository<ReminderSetting>,
    private readonly notificationService: NotificationService,
    private readonly aiService: AiService,
  ) {}

  /** Run every day at 10:00 AM — AI smart analysis for inactive customers */
  @Cron('0 10 * * *', { name: 'follow-up-ai-reminder' })
  async handleAiReminder(): Promise<void> {
    this.logger.log('开始执行AI智能提醒分析...')

    try {
      // Get all reminder settings (including global default userId=0)
      const settings = await this.reminderSettingRepo.find()
      const settingsMap = new Map(settings.map((s) => [s.userId, s]))
      const defaultSetting = settingsMap.get(0)
      const defaultThreshold = defaultSetting?.inactiveDaysThreshold ?? 3

      // M3 fix: Query from customers table (assignedUserId) instead of follow_ups
      // This ensures users with assigned customers but zero follow-ups also get reminders
      const userRows = await this.customerRepo
        .createQueryBuilder('c')
        .select('DISTINCT c.assigned_user_id', 'userId')
        .where('c.deleted_at IS NULL')
        .andWhere('c.assigned_user_id IS NOT NULL')
        .andWhere('c.status NOT IN (:...excludeStatuses)', {
          excludeStatuses: ['invalid', 'lost'],
        })
        .getRawMany<{ userId: number }>()

      // Build per-user task list
      const tasks: Array<{ userId: number; threshold: number }> = []
      for (const { userId } of userRows) {
        const userSetting = settingsMap.get(userId)
        // Skip if user explicitly disabled AI reminder
        if (userSetting && !userSetting.aiReminderEnabled) continue
        // Skip if global default is disabled and user has no custom setting
        if (!userSetting && defaultSetting && !defaultSetting.aiReminderEnabled) continue

        const threshold = userSetting?.inactiveDaysThreshold ?? defaultThreshold
        tasks.push({ userId, threshold })
      }

      // H1 fix: Process in batches with concurrency limit
      let totalReminders = 0
      for (let i = 0; i < tasks.length; i += AI_CONCURRENCY) {
        const batch = tasks.slice(i, i + AI_CONCURRENCY)
        const results = await Promise.allSettled(
          batch.map((t) => this.processUserReminder(t.userId, t.threshold)),
        )
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) totalReminders++
          if (r.status === 'rejected') {
            this.logger.warn(`用户提醒处理失败: ${String(r.reason)}`)
          }
        }
      }

      this.logger.log(`AI智能提醒完成，共提醒 ${totalReminders} 位用户`)
    } catch (error) {
      this.logger.error('AI智能提醒执行失败', error instanceof Error ? error.stack : String(error))
    }
  }

  /**
   * Process AI reminder for a single user.
   * Returns true if a notification was sent.
   */
  private async processUserReminder(userId: number, threshold: number): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - threshold)

    // Find customers assigned to this user with no recent follow-ups
    const inactiveCustomers = await this.customerRepo
      .createQueryBuilder('c')
      .leftJoin(
        FollowUp,
        'f',
        'f.customer_id = c.id AND f.created_at > :cutoff AND f.deleted_at IS NULL',
        { cutoff: cutoffDate },
      )
      .where('c.assigned_user_id = :userId', { userId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere('c.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['invalid', 'lost'],
      })
      .andWhere('f.id IS NULL')
      .select(['c.id', 'c.name', 'c.company', 'c.status', 'c.updatedAt'])
      .take(20)
      .getMany()

    if (inactiveCustomers.length === 0) return false

    // Generate AI reminder content with fallback
    let aiMessage: string
    try {
      const customerSummary = inactiveCustomers
        .map((c) => `- ${c.name}（${c.company ?? '未知公司'}，状态：${c.status}）`)
        .join('\n')

      const aiResult = await this.aiService.chat(
        '你是一个CRM销售助手，帮助销售人员管理客户关系。',
        `以下客户已经超过${threshold}天未联系，请生成简洁的提醒建议（不超过200字）：\n${customerSummary}`,
      )
      aiMessage = aiResult ?? this.buildFallbackMessage(inactiveCustomers, threshold)
    } catch {
      aiMessage = this.buildFallbackMessage(inactiveCustomers, threshold)
    }

    this.notificationService.notifyUser(userId, {
      type: NotificationType.FOLLOW_UP_REMINDER,
      actorId: 0,
      actorName: 'AI 智能提醒',
      resource: 'customer',
      resourceId: 0,
      message: aiMessage,
      data: {
        customerIds: inactiveCustomers.map((c) => c.id),
        customerNames: inactiveCustomers.map((c) => c.name),
        threshold,
        isAiReminder: true,
      },
    })

    return true
  }

  private buildFallbackMessage(customers: Customer[], threshold: number): string {
    const names = customers.map((c) => c.name).join('、')
    return `您有 ${customers.length} 位客户超过${threshold}天未联系，建议尽快跟进：${names}`
  }

  /**
   * Get reminder settings for a user (falls back to global default).
   */
  async getReminderSettings(userId: number): Promise<ReminderSetting> {
    const userSetting = await this.reminderSettingRepo.findOne({ where: { userId } })
    if (userSetting) return userSetting

    // Fall back to global default
    const globalSetting = await this.reminderSettingRepo.findOne({ where: { userId: 0 } })
    if (globalSetting) return globalSetting

    // Return a default object (unsaved)
    return this.reminderSettingRepo.create({
      userId,
      defaultReminderTime: '09:00',
      reminderEnabled: true,
      aiReminderEnabled: true,
      inactiveDaysThreshold: 3,
    })
  }

  /**
   * Update reminder settings for a user.
   */
  async updateReminderSettings(
    userId: number,
    dto: Partial<
      Pick<
        ReminderSetting,
        'defaultReminderTime' | 'reminderEnabled' | 'aiReminderEnabled' | 'inactiveDaysThreshold'
      >
    >,
  ): Promise<ReminderSetting> {
    let setting = await this.reminderSettingRepo.findOne({ where: { userId } })
    if (!setting) {
      setting = this.reminderSettingRepo.create({ userId, ...dto })
    } else {
      Object.assign(setting, dto)
    }
    return this.reminderSettingRepo.save(setting)
  }
}
