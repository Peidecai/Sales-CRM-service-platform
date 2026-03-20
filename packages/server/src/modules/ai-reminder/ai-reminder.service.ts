import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { AiReminder } from './entities/ai-reminder.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { AiService } from '../ai/ai.service'
import { AiReminderType, AiReminderPriority, UserRole, OpportunityStage } from '@crm/shared'
import { AiReminderQueryDto, AiReminderFeedbackDto } from './dto'

interface UserContext {
  id: number
  role: UserRole
}

@Injectable()
export class AiReminderService {
  private readonly logger = new Logger(AiReminderService.name)

  constructor(
    @InjectRepository(AiReminder)
    private readonly reminderRepo: Repository<AiReminder>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    private readonly aiService: AiService,
  ) {}

  async getReminders(
    query: AiReminderQueryDto,
    user: UserContext,
  ): Promise<{ list: AiReminder[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.reminderRepo.createQueryBuilder('r')

    // SALES users only see own reminders
    if (user.role === UserRole.SALES) {
      qb.andWhere('r.user_id = :userId', { userId: user.id })
    }

    if (query.type) {
      qb.andWhere('r.type = :type', { type: query.type })
    }
    if (query.opportunityId) {
      qb.andWhere('r.opportunity_id = :oppId', { oppId: query.opportunityId })
    }
    if (query.priority) {
      qb.andWhere('r.priority = :priority', { priority: query.priority })
    }
    if (query.isRead !== undefined) {
      qb.andWhere('r.is_read = :isRead', { isRead: query.isRead })
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async getSummary(userId: number): Promise<Record<string, number>> {
    const qb = this.reminderRepo
      .createQueryBuilder('r')
      .select('r.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.is_read = false')
      .groupBy('r.type')

    const raw = (await qb.getRawMany()) as Array<{ type: string; count: string }>
    const summary: Record<string, number> = {}
    let totalUnread = 0
    for (const row of raw) {
      summary[row.type] = Number(row.count)
      totalUnread += Number(row.count)
    }
    summary['total'] = totalUnread
    return summary
  }

  async markRead(id: number, userId: number): Promise<AiReminder> {
    const reminder = await this.reminderRepo.findOne({ where: { id, userId } })
    if (!reminder) {
      throw new NotFoundException(`Reminder #${id} not found`)
    }
    reminder.isRead = true
    return this.reminderRepo.save(reminder)
  }

  async markAllRead(userId: number): Promise<void> {
    await this.reminderRepo.update({ userId, isRead: false }, { isRead: true })
  }

  async submitFeedback(
    id: number,
    userId: number,
    dto: AiReminderFeedbackDto,
  ): Promise<AiReminder> {
    const reminder = await this.reminderRepo.findOne({ where: { id, userId } })
    if (!reminder) {
      throw new NotFoundException(`Reminder #${id} not found`)
    }
    reminder.feedback = dto.feedback
    reminder.feedbackAt = new Date()
    return this.reminderRepo.save(reminder)
  }

  async generateNextActions(opportunityId: number): Promise<AiReminder | null> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id: opportunityId },
    })
    if (!opportunity) {
      throw new NotFoundException(`Opportunity #${opportunityId} not found`)
    }

    const systemPrompt = `You are a sales assistant. Based on the opportunity details, suggest the next best action. Return JSON: {"title":"short title","content":"detailed suggestion","priority":"low|medium|high|urgent"}`

    const userMessage = `Opportunity: ${opportunity.title}
Stage: ${opportunity.stage}
Amount: ${opportunity.amount}
Probability: ${opportunity.probability}
Description: ${opportunity.description ?? 'None'}`

    try {
      const response = await this.aiService.chat(systemPrompt, userMessage, {
        temperature: 0.5,
        maxTokens: 512,
      })
      const parsed = JSON.parse(response) as Record<string, string>

      const reminder = this.reminderRepo.create({
        opportunityId,
        userId: opportunity.assignedUserId,
        type: AiReminderType.NEXT_ACTION,
        title: String(parsed['title'] ?? 'Next action suggestion'),
        content: String(parsed['content'] ?? response),
        priority: (parsed['priority'] as AiReminderPriority) ?? AiReminderPriority.MEDIUM,
      })
      return this.reminderRepo.save(reminder)
    } catch (err) {
      this.logger.warn(`Failed to generate next actions for opportunity #${opportunityId}`, err)
      return null
    }
  }

  @Cron('0 3 * * *')
  async detectStagnantOpportunities(): Promise<void> {
    this.logger.log('Detecting stagnant opportunities...')
    const stagnantDays = 14
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - stagnantDays)

    const stagnant = await this.opportunityRepo
      .createQueryBuilder('o')
      .where('o.stage NOT IN (:...closed)', {
        closed: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
      })
      .andWhere('o.updated_at < :cutoff', { cutoff })
      .getMany()

    for (const opp of stagnant) {
      // Check if we already sent a stagnant reminder in the last 7 days
      const existing = await this.reminderRepo
        .createQueryBuilder('r')
        .where('r.opportunity_id = :oppId', { oppId: opp.id })
        .andWhere('r.type = :type', { type: AiReminderType.STAGNANT })
        .andWhere('r.created_at > :recent', {
          recent: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        })
        .getOne()

      if (!existing) {
        const reminder = this.reminderRepo.create({
          opportunityId: opp.id,
          userId: opp.assignedUserId,
          type: AiReminderType.STAGNANT,
          title: `商机"${opp.title}"已停滞${stagnantDays}天`,
          content: `商机"${opp.title}"在"${opp.stage}"阶段已超过${stagnantDays}天未更新，建议尽快跟进。`,
          priority: AiReminderPriority.HIGH,
        })
        await this.reminderRepo.save(reminder)
      }
    }
    this.logger.log(`Created stagnant reminders for ${stagnant.length} opportunities`)
    // suppress unused
    void LessThan
  }

  async aggregateReminders(userId: number): Promise<{
    unread: number
    byType: Record<string, number>
    recentReminders: AiReminder[]
  }> {
    const summary = await this.getSummary(userId)
    const recentReminders = await this.reminderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    })
    return {
      unread: summary['total'] ?? 0,
      byType: summary,
      recentReminders,
    }
  }
}
