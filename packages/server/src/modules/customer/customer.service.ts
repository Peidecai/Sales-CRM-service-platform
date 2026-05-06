import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder, EntityManager } from 'typeorm'
import { Customer } from './customer.entity'
import { User } from '../user/user.entity'
import { DuplicateCheckService } from './services/duplicate-check.service'
import { CustomerNumberService } from './services/customer-number.service'
import { CustomerBloomService } from './services/customer-bloom.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { QueryCustomerDto } from './dto/query-customer.dto'
import { AllocateCustomerDto } from './dto/allocate-customer.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import { CustomerStatus, UserRole } from '@crm/shared'
import { CustomFieldService } from '../custom-field/custom-field.service'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly customFieldService: CustomFieldService,
    private readonly duplicateCheckService: DuplicateCheckService,
    private readonly customerNumberService: CustomerNumberService,
    private readonly bloomService: CustomerBloomService,
  ) {}

  async create(dto: CreateCustomerDto, manager?: EntityManager): Promise<Customer> {
    if (dto.customFields) {
      await this.customFieldService.validateCustomFields(dto.customFields)
    }

    // 普通创建做重复拦截；导入事务内跳过逐条检查，交给导入流程批量处理。
    if (!dto.forceCreate && !manager) {
      const duplicates = await this.duplicateCheckService.checkDuplicates({
        company: dto.company,
        phone: dto.phone,
        email: dto.email,
        unifiedCreditCode: dto.unifiedCreditCode,
      })
      if (duplicates.length > 0) {
        throw new ConflictException({
          message: '发现可能重复的客户',
          duplicates: duplicates.map((d) => ({
            customerId: d.customer.id,
            customerName: d.customer.name,
            company: d.customer.company,
            matchType: d.matchType,
            confidence: d.confidence,
          })),
          allowForceCreate: true,
        })
      }
    }

    const repo = manager ? manager.getRepository(Customer) : this.customerRepository
    const customer = repo.create(dto)
    customer.customerNo = await this.customerNumberService.generate()
    const saved = await repo.save(customer)
    await this.bloomService.add(saved.id)
    await this.invalidateListCache()
    return saved
  }

  async findAll(
    query: QueryCustomerDto,
    user: AuthUser,
  ): Promise<{ list: Customer[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, status, assignedUserId } = query

    // SALES users can only see their own customers
    const effectiveAssignedUserId = user.role === UserRole.SALES ? user.id : assignedUserId

    // 缓存 key 带角色和用户，防止 SALES 用户读到其他人的客户列表缓存。
    const cacheKey = `${CACHE_KEYS.CUSTOMER_LIST}:${JSON.stringify({ page, pageSize, keyword, status, assignedUserId: effectiveAssignedUserId, _role: user.role, _uid: user.id })}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as { list: Customer[]; total: number }
    }

    const qb = this.customerRepository.createQueryBuilder('customer')

    this.applyDataPermission(qb, user)

    if (keyword) {
      qb.andWhere(
        '(customer.name LIKE :kw OR customer.company LIKE :kw OR customer.phone LIKE :kw OR customer.email LIKE :kw)',
        { kw: `%${keyword}%` },
      )
    }

    if (status) {
      qb.andWhere('customer.status = :status', { status })
    }

    if (assignedUserId && user.role !== UserRole.SALES) {
      qb.andWhere('customer.assignedUserId = :assignedUserId', { assignedUserId })
    }

    qb.orderBy('customer.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    const result = { list, total }

    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.CUSTOMER_LIST)
    return result
  }

  async findOne(id: number, user?: AuthUser): Promise<Customer> {
    // Bloom 过滤器只用于快速判定“一定不存在”；可能存在仍需查缓存/数据库。
    const mayExist = await this.bloomService.mightExist(id)
    if (!mayExist) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    const cacheKey = `${CACHE_KEYS.CUSTOMER_DETAIL}:${id}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      const customer = JSON.parse(cached) as Customer
      this.checkOwnership(customer, user)
      return customer
    }

    const customer = await this.customerRepository.findOne({
      where: { id },
    })

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    this.checkOwnership(customer, user)

    await this.redisService.set(cacheKey, JSON.stringify(customer), CACHE_TTL.CUSTOMER_DETAIL)
    return customer
  }

  async update(id: number, dto: UpdateCustomerDto, user?: AuthUser): Promise<Customer> {
    const customer = await this.findOne(id, user)

    // Validate custom fields if provided
    if (dto.customFields) {
      await this.customFieldService.validateCustomFields(dto.customFields)
    }

    // Validate status transition if status is being changed
    if (dto.status && dto.status !== customer.status) {
      if (!this.validateStatusTransition(customer.status, dto.status)) {
        throw new BadRequestException('状态转换不允许')
      }
    }

    Object.assign(customer, dto)
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    return saved
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id)
    await this.customerRepository.softRemove(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
  }

  async allocate(id: number, dto: AllocateCustomerDto): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } })
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.assignedUserId },
    })
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${dto.assignedUserId} not found`)
    }
    if (!targetUser.isActive) {
      throw new BadRequestException(`User with ID ${dto.assignedUserId} is not active`)
    }

    customer.assignedUserId = dto.assignedUserId
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    return saved
  }

  /** Status machine: ordered progression of customer states */
  private readonly STATUS_ORDER: CustomerStatus[] = [
    CustomerStatus.LEAD,
    CustomerStatus.POTENTIAL,
    CustomerStatus.INTENTION,
    CustomerStatus.OPPORTUNITY,
    CustomerStatus.DEAL,
    CustomerStatus.MAINTAIN,
  ]

  /** Validate if a status transition is allowed */
  validateStatusTransition(from: CustomerStatus, to: CustomerStatus): boolean {
    // 无效/流失是终态分支，可从任意主流程状态进入。
    if (to === CustomerStatus.INVALID || to === CustomerStatus.LOST) return true
    // 进入终态后不允许直接回主流程，需通过其他显式业务动作恢复。
    if (from === CustomerStatus.INVALID || from === CustomerStatus.LOST) return false
    const fromIdx = this.STATUS_ORDER.indexOf(from)
    const toIdx = this.STATUS_ORDER.indexOf(to)
    // only allow forward by exactly one step
    return toIdx === fromIdx + 1
  }

  /** Extend customer protection period based on current status */
  async extendProtection(customerId: number): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    })
    if (!customer || customer.isInPool) return

    const protectDaysMap: Record<string, number> = {
      lead: 15,
      potential: 15,
      intention: 30,
      opportunity: 45,
      deal: 60,
      maintain: 60,
    }
    const days = protectDaysMap[customer.status] ?? 15

    const newProtectUntil = new Date()
    newProtectUntil.setDate(newProtectUntil.getDate() + days)

    if (!customer.protectUntil || newProtectUntil > customer.protectUntil) {
      customer.protectUntil = newProtectUntil
      await this.customerRepository.save(customer)
      await this.invalidateDetailCache(customerId)
    }
  }

  /** Invalidate all customer list caches */
  async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.CUSTOMER_LIST}:*`)
  }

  /** Invalidate a single customer detail cache */
  async invalidateDetailCache(id: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.CUSTOMER_DETAIL}:${id}`)
  }

  /** Apply data permission: SALES users can only see their own records */
  private applyDataPermission(qb: SelectQueryBuilder<Customer>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('customer.assignedUserId = :currentUserId', { currentUserId: user.id })
    }
  }

  /** Check ownership for single record access */
  private checkOwnership(customer: Customer, user?: AuthUser): void {
    if (user && user.role === UserRole.SALES && customer.assignedUserId !== user.id) {
      throw new ForbiddenException('您无权访问此客户')
    }
  }
}
