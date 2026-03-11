import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FollowUp } from './follow-up.entity'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../notification/notification.types'

@Injectable()
export class FollowUpScheduler {
  private readonly logger = new Logger(FollowUpScheduler.name)

  constructor(
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    private readonly notificationService: NotificationService,
  ) {}

  /** Run every day at 8:30 AM — remind users about today's scheduled follow-ups */
  @Cron('30 8 * * *', { name: 'follow-up-daily-reminder' })
  async handleDailyReminder(): Promise<void> {
    this.logger.log('开始执行跟进提醒任务...')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find follow-ups with nextFollowUpDate = today that are not deleted
    const followUps = await this.followUpRepo
      .createQueryBuilder('f')
      .where('f.deleted = :deleted', { deleted: false })
      .andWhere('f.next_follow_up_date IS NOT NULL')
      .andWhere('f.next_follow_up_date >= :today', { today: today.toISOString().slice(0, 10) })
      .andWhere('f.next_follow_up_date < :tomorrow', {
        tomorrow: tomorrow.toISOString().slice(0, 10),
      })
      .getMany()

    if (followUps.length === 0) {
      this.logger.log('今日无待跟进任务')
      return
    }

    // Group by userId
    const grouped = new Map<number, FollowUp[]>()
    for (const fu of followUps) {
      const list = grouped.get(fu.userId) || []
      list.push(fu)
      grouped.set(fu.userId, list)
    }

    for (const [userId, items] of grouped) {
      this.notificationService.notifyUser(userId, {
        type: NotificationType.FOLLOW_UP_REMINDER,
        actorId: 0,
        actorName: '系统提醒',
        resource: 'follow_up',
        resourceId: items[0].id,
        message: `您今日有 ${items.length} 条待跟进任务，请及时处理`,
        data: { count: items.length, followUpIds: items.map((i) => i.id) },
      })
    }

    this.logger.log(`跟进提醒完成，共提醒 ${grouped.size} 位用户`)
  }

  /** Run every day at 9 AM — warn about overdue follow-ups */
  @Cron('0 9 * * *', { name: 'follow-up-overdue-check' })
  async handleOverdueCheck(): Promise<void> {
    this.logger.log('开始检查逾期跟进任务...')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdue = await this.followUpRepo
      .createQueryBuilder('f')
      .where('f.deleted = :deleted', { deleted: false })
      .andWhere('f.next_follow_up_date IS NOT NULL')
      .andWhere('f.next_follow_up_date < :today', { today: today.toISOString().slice(0, 10) })
      .getMany()

    if (overdue.length === 0) {
      this.logger.log('无逾期跟进任务')
      return
    }

    const grouped = new Map<number, FollowUp[]>()
    for (const fu of overdue) {
      const list = grouped.get(fu.userId) || []
      list.push(fu)
      grouped.set(fu.userId, list)
    }

    for (const [userId, items] of grouped) {
      this.notificationService.notifyUser(userId, {
        type: NotificationType.FOLLOW_UP_OVERDUE,
        actorId: 0,
        actorName: '系统提醒',
        resource: 'follow_up',
        resourceId: items[0].id,
        message: `您有 ${items.length} 条逾期未完成的跟进任务`,
        data: { count: items.length, followUpIds: items.map((i) => i.id) },
      })
    }

    this.logger.log(`逾期提醒完成，共提醒 ${grouped.size} 位用户，${overdue.length} 条逾期任务`)
  }
}
