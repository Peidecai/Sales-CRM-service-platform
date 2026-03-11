import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from '../customer/customer.entity'
import { FollowUp } from '../follow-up/follow-up.entity'
import { CustomerPoolLog, PoolAction } from './entities/customer-pool-log.entity'
import { CustomerPoolConfigService } from './customer-pool-config.service'

@Injectable()
export class CustomerPoolScheduler {
  private readonly logger = new Logger(CustomerPoolScheduler.name)

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    @InjectRepository(CustomerPoolLog)
    private readonly poolLogRepo: Repository<CustomerPoolLog>,
    private readonly configService: CustomerPoolConfigService,
  ) {}

  @Cron('0 2 * * *', { name: 'auto-recycle-customers' })
  async handleAutoRecycle(): Promise<void> {
    const config = await this.configService.getConfig()
    if (!config.auto_recycle_enabled) return

    this.logger.log('开始执行客户自动回收任务...')

    const recycleDaysMap: Record<string, number> = {
      lead: config.recycle_days_lead,
      potential: config.recycle_days_potential,
      intention: config.recycle_days_intention,
    }

    let recycledCount = 0

    for (const [status, days] of Object.entries(recycleDaysMap)) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const customers = await this.customerRepo
        .createQueryBuilder('c')
        .where('c.status = :status', { status })
        .andWhere('c.is_in_pool = false')
        .andWhere('c.deleted = false')
        .andWhere('(c.protect_until IS NULL OR c.protect_until < NOW())')
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('MAX(f.created_at)')
            .from(FollowUp, 'f')
            .where('f.customer_id = c.id AND f.deleted = false')
            .getQuery()
          return `(${subQuery}) < :cutoff OR (${subQuery}) IS NULL`
        })
        .setParameter('cutoff', cutoffDate)
        .getMany()

      for (const customer of customers) {
        const prevUserId = customer.assignedUserId
        customer.isInPool = true
        customer.assignedUserId = null as unknown as number
        customer.poolEnterTime = new Date()
        customer.protectUntil = null as unknown as Date
        await this.customerRepo.save(customer)

        const log = this.poolLogRepo.create({
          customerId: customer.id,
          action: PoolAction.RECYCLE,
          fromUserId: prevUserId,
          reason: `自动回收：${status}状态超${days}天未跟进`,
        })
        await this.poolLogRepo.save(log)
        recycledCount++
      }
    }

    this.logger.log(`自动回收完成，共回收 ${recycledCount} 个客户`)
  }
}
