import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Contract } from '../contract/entities/contract.entity'
import { Payment } from '../payment/entities/payment.entity'
import { User } from '../user/user.entity'
import { SalesTarget } from '../sales-target/sales-target.entity'
import { Customer } from '../customer/customer.entity'
import { RedisService } from '../../common/redis/redis.service'
import { ContractStatus, PaymentStatus } from '@crm/shared'

@Injectable()
export class ScreenService {
  private readonly logger = new Logger(ScreenService.name)
  private readonly SCREEN_TTL = 300 // 5min

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SalesTarget)
    private readonly salesTargetRepo: Repository<SalesTarget>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly redis: RedisService,
  ) {}

  async getPerformanceScreen(): Promise<unknown> {
    const cacheKey = 'screen:performance'
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    // Total revenue
    const revenueQb = this.contractRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.total_amount), 0)', 'totalRevenue')
      .addSelect('COUNT(*)', 'totalContracts')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })

    // Monthly trend (last 12 months)
    const trendQb = this.contractRepo
      .createQueryBuilder('c')
      .select("DATE_FORMAT(c.sign_date, '%Y-%m')", 'period')
      .addSelect('SUM(c.total_amount)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .where('c.deletedAt IS NULL')
      .andWhere('c.sign_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
      .groupBy("DATE_FORMAT(c.sign_date, '%Y-%m')")
      .orderBy("DATE_FORMAT(c.sign_date, '%Y-%m')", 'ASC')

    // Top 10 ranking
    const top10Qb = this.contractRepo
      .createQueryBuilder('c')
      .select('c.owner_id', 'userId')
      .addSelect('u.name', 'userName')
      .addSelect('SUM(c.total_amount)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .leftJoin(User, 'u', 'u.id = c.owner_id')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
      .groupBy('c.owner_id')
      .addGroupBy('u.name')
      .orderBy('SUM(c.total_amount)', 'DESC')
      .limit(10)

    // Recent signings
    const recentQb = this.contractRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.title', 'c.totalAmount', 'c.signDate', 'c.ownerId'])
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })
      .orderBy('c.sign_date', 'DESC')
      .limit(20)

    // Target progress
    const targetQb = this.salesTargetRepo
      .createQueryBuilder('st')
      .select('st.name', 'name')
      .addSelect('st.target_value', 'targetValue')
      .addSelect('st.achieved_value', 'achievedValue')
      .addSelect('ROUND(st.achieved_value * 100.0 / GREATEST(st.target_value, 1), 2)', 'progress')
      .where('st.deletedAt IS NULL')
      .andWhere("st.scope = 'company'")
      .orderBy('st.year', 'DESC')
      .limit(5)

    const [revenue, trend, top10, recent, targets] = await Promise.all([
      revenueQb.getRawOne(),
      trendQb.getRawMany(),
      top10Qb.getRawMany(),
      recentQb.getMany(),
      targetQb.getRawMany(),
    ])

    const result = {
      totalRevenue: Number(revenue?.totalRevenue ?? 0),
      totalContracts: Number(revenue?.totalContracts ?? 0),
      trendLine: trend,
      top10Ranking: top10,
      recentSignings: recent,
      targetProgress: targets,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), this.SCREEN_TTL)
    return result
  }

  async getCockpitScreen(): Promise<unknown> {
    const cacheKey = 'screen:cockpit'
    const cached = await this.redis.safeGet(cacheKey)
    if (cached) return JSON.parse(cached)

    const today = new Date().toISOString().slice(0, 10)

    // Today's calls
    const callQb = this.callRecordRepo
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'todayCalls')
      .addSelect(
        'ROUND(SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END) * 100.0 / GREATEST(COUNT(*), 1), 2)',
        'connectRate',
      )
      .addSelect('AVG(CASE WHEN cr.duration > 0 THEN cr.duration ELSE NULL END)', 'avgDuration')
      .where('cr.deletedAt IS NULL')
      .andWhere('DATE(cr.call_at) = :today', { today })

    // Funnel data
    const custCountQb = this.customerRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.deletedAt IS NULL')

    const oppCountQb = this.opportunityRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'count')
      .where('o.deletedAt IS NULL')

    const contractCountQb = this.contractRepo
      .createQueryBuilder('c')
      .select('COUNT(*)', 'count')
      .where('c.deletedAt IS NULL')
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING, ContractStatus.COMPLETED],
      })

    // Payment progress
    const paymentQb = this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.planned_amount), 0)', 'totalPlanned')
      .addSelect(
        `COALESCE(SUM(CASE WHEN p.status = '${PaymentStatus.CONFIRMED}' THEN p.actual_amount ELSE 0 END), 0)`,
        'totalCollected',
      )
      .where('p.deletedAt IS NULL')

    // Team efficiency (top users by call count today)
    const teamQb = this.callRecordRepo
      .createQueryBuilder('cr')
      .select('cr.user_id', 'userId')
      .addSelect('u.name', 'userName')
      .addSelect('COUNT(*)', 'callCount')
      .addSelect('SUM(CASE WHEN cr.duration > 0 THEN 1 ELSE 0 END)', 'connected')
      .leftJoin(User, 'u', 'u.id = cr.user_id')
      .where('cr.deletedAt IS NULL')
      .andWhere('DATE(cr.call_at) = :today', { today })
      .groupBy('cr.user_id')
      .addGroupBy('u.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)

    const [calls, custCount, oppCount, contractCount, payments, team] = await Promise.all([
      callQb.getRawOne(),
      custCountQb.getRawOne(),
      oppCountQb.getRawOne(),
      contractCountQb.getRawOne(),
      paymentQb.getRawOne(),
      teamQb.getRawMany(),
    ])

    const result = {
      todayCalls: Number(calls?.todayCalls ?? 0),
      connectRate: Number(calls?.connectRate ?? 0),
      avgDuration: Number(calls?.avgDuration ?? 0),
      funnelData: {
        customers: Number(custCount?.count ?? 0),
        opportunities: Number(oppCount?.count ?? 0),
        contracts: Number(contractCount?.count ?? 0),
      },
      paymentProgress: {
        totalPlanned: Number(payments?.totalPlanned ?? 0),
        totalCollected: Number(payments?.totalCollected ?? 0),
      },
      teamEfficiency: team,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), this.SCREEN_TTL)
    return result
  }
}
