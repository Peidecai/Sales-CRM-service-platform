import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { Customer } from '../customer/customer.entity'
import { CustomerPoolLog, PoolAction } from './entities/customer-pool-log.entity'
import { CustomerPoolConfigService } from './customer-pool-config.service'
import { RedisService } from '../../common/redis'
import { QueryPoolDto, QueryPoolLogDto } from './dto'

@Injectable()
export class CustomerPoolService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerPoolLog)
    private readonly poolLogRepository: Repository<CustomerPoolLog>,
    private readonly dataSource: DataSource,
    private readonly configService: CustomerPoolConfigService,
    private readonly redisService: RedisService,
  ) {}

  async claim(userId: number, customerId: number): Promise<Customer> {
    const config = await this.configService.getConfig()

    // Check cooldown period (read-only, safe outside transaction)
    const lastReturn = await this.poolLogRepository
      .createQueryBuilder('log')
      .where('log.customer_id = :customerId', { customerId })
      .andWhere('log.from_user_id = :userId', { userId })
      .andWhere('log.action = :action', { action: PoolAction.RETURN })
      .orderBy('log.created_at', 'DESC')
      .getOne()

    if (lastReturn) {
      const cooldownEnd = new Date(lastReturn.createdAt)
      cooldownEnd.setDate(cooldownEnd.getDate() + config.cooldown_days)
      if (new Date() < cooldownEnd) {
        throw new BadRequestException(`冷却期内不可领取该客户，请${config.cooldown_days}天后再试`)
      }
    }

    // Check daily claim limit (Redis atomic incr, safe outside transaction)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const claimKey = `pool:claim:${userId}:${today}`
    const claimCount = await this.redisService.incr(claimKey)
    if (claimCount === 1) {
      await this.redisService.expire(claimKey, 86400)
    }
    if (claimCount > config.daily_claim_limit) {
      throw new BadRequestException(`今日领取已达上限(${config.daily_claim_limit}个)`)
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Pessimistic lock: prevent concurrent claims on the same customer
      const customer = await queryRunner.manager
        .createQueryBuilder(Customer, 'customer')
        .setLock('pessimistic_write')
        .where('customer.id = :id', { id: customerId })
        .andWhere('customer.isInPool = true')
        .getOne()

      if (!customer) {
        throw new NotFoundException('客户不在公海池中或已被其他人领取')
      }

      // Check max holding inside transaction to avoid race condition
      const holdingCount = await queryRunner.manager.count(Customer, {
        where: { assignedUserId: userId, isInPool: false },
      })
      if (holdingCount >= config.max_holding) {
        throw new BadRequestException(`持有客户数已达上限(${config.max_holding}个)`)
      }

      const protectDays = config.protect_days_new
      const protectUntil = new Date()
      protectUntil.setDate(protectUntil.getDate() + protectDays)

      customer.isInPool = false
      customer.assignedUserId = userId
      customer.poolEnteredAt = null as unknown as Date
      customer.protectUntil = protectUntil
      await queryRunner.manager.save(customer)

      const log = this.poolLogRepository.create({
        customerId,
        action: PoolAction.CLAIM,
        toUserId: userId,
      })
      await queryRunner.manager.save(log)

      await queryRunner.commitTransaction()

      // Invalidate cache only after successful commit
      await this.redisService.delByPattern('cache:customers:*')

      return customer
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async batchClaim(
    userId: number,
    customerIds: number[],
  ): Promise<{ success: number[]; failed: Array<{ id: number; reason: string }> }> {
    const success: number[] = []
    const failed: Array<{ id: number; reason: string }> = []

    for (const id of customerIds) {
      try {
        await this.claim(userId, id)
        success.push(id)
      } catch (err) {
        failed.push({ id, reason: (err as Error).message })
      }
    }
    return { success, failed }
  }

  async assign(managerId: number, customerId: number, toUserId: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, isInPool: true },
    })
    if (!customer) {
      throw new NotFoundException('客户不在公海池中')
    }

    const queryRunner = this.customerRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const config = await this.configService.getConfig()
      const protectUntil = new Date()
      protectUntil.setDate(protectUntil.getDate() + config.protect_days_new)

      customer.isInPool = false
      customer.assignedUserId = toUserId
      customer.poolEnteredAt = null as unknown as Date
      customer.protectUntil = protectUntil
      await queryRunner.manager.save(customer)

      const log = this.poolLogRepository.create({
        customerId,
        action: PoolAction.ASSIGN,
        fromUserId: managerId,
        toUserId,
      })
      await queryRunner.manager.save(log)

      await queryRunner.commitTransaction()
      return customer
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async returnToPool(userId: number, customerId: number, reason?: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    })
    if (!customer) {
      throw new NotFoundException('客户不存在')
    }
    if (customer.assignedUserId !== userId) {
      throw new ForbiddenException('只能退回自己负责的客户')
    }

    const queryRunner = this.customerRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      customer.isInPool = true
      customer.assignedUserId = null as unknown as number
      customer.poolEnteredAt = new Date()
      customer.protectUntil = null as unknown as Date
      await queryRunner.manager.save(customer)

      const log = this.poolLogRepository.create({
        customerId,
        action: PoolAction.RETURN,
        fromUserId: userId,
        reason,
      })
      await queryRunner.manager.save(log)

      await queryRunner.commitTransaction()
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async batchReturn(
    userId: number,
    customerIds: number[],
    reason?: string,
  ): Promise<{ success: number[]; failed: Array<{ id: number; reason: string }> }> {
    const success: number[] = []
    const failed: Array<{ id: number; reason: string }> = []

    for (const id of customerIds) {
      try {
        await this.returnToPool(userId, id, reason)
        success.push(id)
      } catch (err) {
        failed.push({ id, reason: (err as Error).message })
      }
    }
    return { success, failed }
  }

  async getPoolList(query: QueryPoolDto): Promise<{ list: Customer[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, industry, region } = query

    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.is_in_pool = true')

    if (keyword) {
      qb.andWhere('(customer.name LIKE :kw OR customer.company LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (industry) {
      qb.andWhere('customer.industry = :industry', { industry })
    }
    if (region) {
      qb.andWhere('customer.region LIKE :region', { region: `%${region}%` })
    }

    qb.orderBy('customer.poolEnteredAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async getPoolLogs(query: QueryPoolLogDto): Promise<{ list: CustomerPoolLog[]; total: number }> {
    const { customerId, page = 1, pageSize = 20 } = query

    const qb = this.poolLogRepository
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (customerId) {
      qb.where('log.customer_id = :customerId', { customerId })
    }

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }
}
