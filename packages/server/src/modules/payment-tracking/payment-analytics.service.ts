import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PaymentPlanItem } from './entities/payment-plan-item.entity'
import { NotificationService } from '../notification/notification.service'
import { PaymentAnalyticsQueryDto } from './dto/payment-tracking.dto'

@Injectable()
export class PaymentAnalyticsService {
  private readonly logger = new Logger(PaymentAnalyticsService.name)

  constructor(
    @InjectRepository(PaymentPlanItem)
    private readonly itemRepo: Repository<PaymentPlanItem>,
    private readonly notificationService: NotificationService,
  ) {}

  async getDashboard(query: PaymentAnalyticsQueryDto) {
    const qb = this.itemRepo.createQueryBuilder('ppi')
    if (query.startDate) qb.andWhere('ppi.dueDate >= :start', { start: query.startDate })
    if (query.endDate) qb.andWhere('ppi.dueDate <= :end', { end: query.endDate })

    const totalDue = await qb.clone().select('SUM(ppi.amount)', 'total').getRawOne()
    const totalPaid = await qb.clone().select('SUM(ppi.paidAmount)', 'total').getRawOne()
    const overdueAmount = await qb
      .clone()
      .andWhere('ppi.status = :s', { s: 'overdue' })
      .select('SUM(ppi.amount - ppi.paidAmount)', 'total')
      .getRawOne()

    const due = Number(totalDue?.total ?? 0)
    const paid = Number(totalPaid?.total ?? 0)
    const overdue = Number(overdueAmount?.total ?? 0)

    return {
      totalDue: due,
      totalPaid: paid,
      overdueAmount: overdue,
      collectionRate: due > 0 ? Math.round((paid / due) * 100) : 0,
    }
  }

  async getAgingAnalysis(query: PaymentAnalyticsQueryDto) {
    const today = new Date().toISOString().split('T')[0]
    const qb = this.itemRepo
      .createQueryBuilder('ppi')
      .andWhere('ppi.status IN (:...statuses)', { statuses: ['pending', 'overdue', 'partial'] })

    if (query.salesUserId) {
      qb.innerJoin('payment_plans', 'pp', 'pp.id = ppi.plan_id').andWhere(
        'pp.sales_user_id = :uid',
        { uid: query.salesUserId },
      )
    }

    const items = await qb.getMany()
    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 }

    for (const item of items) {
      const remaining = Number(item.amount) - Number(item.paidAmount)
      if (remaining <= 0) continue
      const dueDate = new Date(item.dueDate)
      const todayDate = new Date(today)
      const daysOverdue = Math.floor(
        (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      )

      if (daysOverdue <= 0) buckets.current += remaining
      else if (daysOverdue <= 30) buckets['1_30'] += remaining
      else if (daysOverdue <= 60) buckets['31_60'] += remaining
      else if (daysOverdue <= 90) buckets['61_90'] += remaining
      else buckets['90_plus'] += remaining
    }

    return buckets
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkOverdueItems(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const result = await this.itemRepo
      .createQueryBuilder()
      .update(PaymentPlanItem)
      .set({ status: 'overdue' })
      .where('status = :pending', { pending: 'pending' })
      .andWhere('dueDate < :today', { today })
      .execute()

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} payment plan items as overdue`)
    }
  }
}
