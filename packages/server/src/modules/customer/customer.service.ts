import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { Customer } from './customer.entity'
import { User } from '../user/user.entity'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { QueryCustomerDto } from './dto/query-customer.dto'
import { AllocateCustomerDto } from './dto/allocate-customer.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import { CustomerStatus, UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create(dto)
    const saved = await this.customerRepository.save(customer)
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

    // Build cache key from query params (include userId for SALES role isolation)
    const cacheKey = `${CACHE_KEYS.CUSTOMER_LIST}:${JSON.stringify({ page, pageSize, keyword, status, assignedUserId: effectiveAssignedUserId, _role: user.role, _uid: user.id })}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as { list: Customer[]; total: number }
    }

    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deleted = :deleted', { deleted: false })

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
    const cacheKey = `${CACHE_KEYS.CUSTOMER_DETAIL}:${id}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      const customer = JSON.parse(cached) as Customer
      this.checkOwnership(customer, user)
      return customer
    }

    const customer = await this.customerRepository.findOne({
      where: { id, deleted: false },
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
    Object.assign(customer, dto)
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    return saved
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id)
    customer.deleted = true
    await this.customerRepository.save(customer)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
  }

  async allocate(id: number, dto: AllocateCustomerDto): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id, deleted: false } })
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.assignedUserId, deleted: false },
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

  /** Invalidate all customer list caches */
  private async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.CUSTOMER_LIST}:*`)
  }

  /** Invalidate a single customer detail cache */
  private async invalidateDetailCache(id: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.CUSTOMER_DETAIL}:${id}`)
  }

  /**
   * Export all non-deleted customers as CSV string.
   */
  async exportCsv(user: AuthUser): Promise<string> {
    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deleted = :deleted', { deleted: false })

    this.applyDataPermission(qb, user)
    qb.orderBy('customer.updatedAt', 'DESC')

    const customers = await qb.getMany()

    const header = '姓名,公司,手机,邮箱,状态,行业,来源,备注'
    const rows = customers.map((c) => {
      return [
        this.escapeCsvField(c.name),
        this.escapeCsvField(c.company ?? ''),
        this.escapeCsvField(c.phone ?? ''),
        this.escapeCsvField(c.email ?? ''),
        this.escapeCsvField(c.status ?? ''),
        this.escapeCsvField(c.industry ?? ''),
        this.escapeCsvField(c.source ?? ''),
        this.escapeCsvField(c.notes ?? ''),
      ].join(',')
    })

    // Add BOM for Excel UTF-8 compatibility
    return '\uFEFF' + [header, ...rows].join('\n')
  }

  /**
   * Import customers from parsed CSV rows.
   * Returns count of successfully imported records.
   */
  async importFromCsvRows(
    rows: Array<Record<string, string>>,
    assignedUserId: number,
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    const toCreate: Partial<Customer>[] = []
    const validStatuses = Object.values(CustomerStatus) as string[]

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const lineNum = i + 2 // +1 for header, +1 for 1-indexed

      const name = (row['姓名'] ?? row['name'] ?? '').trim()
      if (!name) {
        errors.push(`第${lineNum}行：姓名不能为空`)
        continue
      }

      let status = (row['状态'] ?? row['status'] ?? '').trim()
      if (status) {
        // Map Chinese status labels to enum values
        const statusLabelMap: Record<string, string> = {
          潜在客户: CustomerStatus.POTENTIAL,
          跟进中: CustomerStatus.FOLLOWING,
          谈判中: CustomerStatus.NEGOTIATING,
          已签约: CustomerStatus.SIGNED,
          已流失: CustomerStatus.LOST,
          暂不合作: CustomerStatus.INACTIVE,
        }
        status = statusLabelMap[status] ?? status
        if (!validStatuses.includes(status)) {
          errors.push(`第${lineNum}行：无效的状态值 "${row['状态'] ?? row['status']}"`)
          continue
        }
      }

      toCreate.push({
        name,
        company: (row['公司'] ?? row['company'] ?? '').trim() || undefined,
        phone: (row['手机'] ?? row['phone'] ?? '').trim() || undefined,
        email: (row['邮箱'] ?? row['email'] ?? '').trim() || undefined,
        status: (status as CustomerStatus) || CustomerStatus.POTENTIAL,
        industry: (row['行业'] ?? row['industry'] ?? '').trim() || undefined,
        source: (row['来源'] ?? row['source'] ?? '').trim() || undefined,
        notes: (row['备注'] ?? row['notes'] ?? '').trim() || undefined,
        assignedUserId,
      })
    }

    if (toCreate.length === 0) {
      throw new BadRequestException('没有有效的客户数据可导入')
    }

    const entities = this.customerRepository.create(toCreate)
    await this.customerRepository.save(entities)
    await this.invalidateListCache()

    return { imported: toCreate.length, errors }
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

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
