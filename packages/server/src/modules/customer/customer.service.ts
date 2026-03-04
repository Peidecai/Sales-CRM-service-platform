import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Customer } from './customer.entity'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { QueryCustomerDto } from './dto/query-customer.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create(dto)
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    return saved
  }

  async findAll(query: QueryCustomerDto): Promise<{ list: Customer[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, status, assignedUserId } = query

    // Build cache key from query params
    const cacheKey = `${CACHE_KEYS.CUSTOMER_LIST}:${JSON.stringify({ page, pageSize, keyword, status, assignedUserId })}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as { list: Customer[]; total: number }
    }

    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deleted = :deleted', { deleted: false })

    if (keyword) {
      qb.andWhere(
        '(customer.name LIKE :kw OR customer.company LIKE :kw OR customer.phone LIKE :kw OR customer.email LIKE :kw)',
        { kw: `%${keyword}%` },
      )
    }

    if (status) {
      qb.andWhere('customer.status = :status', { status })
    }

    if (assignedUserId) {
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

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, deleted: false },
      relations: ['opportunities', 'callRecords'],
    })

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`)
    }

    return customer
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id)
    Object.assign(customer, dto)
    const saved = await this.customerRepository.save(customer)
    await this.invalidateListCache()
    return saved
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id)
    customer.deleted = true
    await this.customerRepository.save(customer)
    await this.invalidateListCache()
  }

  /** Invalidate all customer list caches */
  private async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.CUSTOMER_LIST}:*`)
  }
}
