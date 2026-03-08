import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FollowUp } from './follow-up.entity'
import { Customer } from '../customer/customer.entity'
import { CreateFollowUpDto } from './dto/create-follow-up.dto'
import { QueryFollowUpDto } from './dto/query-follow-up.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import { UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

@Injectable()
export class FollowUpService {
  constructor(
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateFollowUpDto, user: AuthUser): Promise<FollowUp> {
    await this.ensureCustomerAccessible(dto.customerId, user)

    const followUp = this.followUpRepo.create({ ...dto, userId: user.id })
    const saved = await this.followUpRepo.save(followUp)
    await this.invalidateCustomerCache(dto.customerId)
    return saved
  }

  async findByCustomer(
    customerId: number,
    query: QueryFollowUpDto,
    user: AuthUser,
  ): Promise<{ list: FollowUp[]; total: number }> {
    await this.ensureCustomerAccessible(customerId, user)
    const { page = 1, pageSize = 20, type } = query

    const cacheKey = `${CACHE_KEYS.FOLLOW_UP_LIST}:${customerId}:${JSON.stringify({ page, pageSize, type, _role: user.role, _uid: user.role === UserRole.SALES ? user.id : 0 })}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as { list: FollowUp[]; total: number }
    }

    const where: Record<string, unknown> = { customerId, deleted: false }
    if (type) {
      where['type'] = type
    }

    const [list, total] = await this.followUpRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const result = { list, total }
    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.FOLLOW_UP_LIST)
    return result
  }

  async findOne(id: number): Promise<FollowUp> {
    const followUp = await this.followUpRepo.findOne({ where: { id, deleted: false } })
    if (!followUp) {
      throw new NotFoundException(`FollowUp with ID ${id} not found`)
    }
    return followUp
  }

  async update(id: number, dto: Partial<CreateFollowUpDto>, user: AuthUser): Promise<FollowUp> {
    const followUp = await this.findOne(id)

    if (user.role === UserRole.SALES && followUp.userId !== user.id) {
      throw new ForbiddenException('您无权修改此跟进记录')
    }

    // customerId is not updatable
    if (dto.customerId !== undefined && dto.customerId !== followUp.customerId) {
      throw new BadRequestException('不允许修改跟进记录所属客户')
    }

    Object.assign(followUp, dto)
    const saved = await this.followUpRepo.save(followUp)
    await this.invalidateCustomerCache(followUp.customerId)
    return saved
  }

  async remove(id: number, user: AuthUser): Promise<void> {
    const followUp = await this.findOne(id)

    if (user.role === UserRole.SALES && followUp.userId !== user.id) {
      throw new ForbiddenException('您无权删除此跟进记录')
    }

    followUp.deleted = true
    await this.followUpRepo.save(followUp)
    await this.invalidateCustomerCache(followUp.customerId)
  }

  private async invalidateCustomerCache(customerId: number): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.FOLLOW_UP_LIST}:${customerId}:*`)
  }

  private async ensureCustomerAccessible(customerId: number, user: AuthUser): Promise<void> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, deleted: false },
    })
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`)
    }
    if (user.role === UserRole.SALES && customer.assignedUserId !== user.id) {
      throw new ForbiddenException('No permission to access follow-ups for this customer')
    }
  }
}
