import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Cron } from '@nestjs/schedule'
import { UserRole } from '@crm/shared'
import type { GroupRule } from '@crm/shared'
import { CustomerGroup } from './entities/customer-group.entity'
import { CustomerGroupMember } from './entities/customer-group-member.entity'
import { Customer } from '../customer/customer.entity'
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto'
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto'
import { buildGroupRuleQuery } from './group-rule-engine'

@Injectable()
export class CustomerGroupService {
  private readonly logger = new Logger(CustomerGroupService.name)

  constructor(
    @InjectRepository(CustomerGroup)
    private readonly groupRepo: Repository<CustomerGroup>,
    @InjectRepository(CustomerGroupMember)
    private readonly memberRepo: Repository<CustomerGroupMember>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerGroupDto, userId: number): Promise<CustomerGroup> {
    if (dto.type === 'dynamic' && (!dto.rules || dto.rules.length === 0)) {
      throw new BadRequestException('动态分组必须指定规则')
    }
    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type,
      rules: (dto.rules as GroupRule[] | undefined) ?? null,
      createdById: userId,
    })
    const saved = (await this.groupRepo.save(group)) as CustomerGroup
    const savedId = Array.isArray(saved) ? saved[0].id : saved.id

    if (dto.type === 'dynamic') {
      await this.refreshDynamic(savedId)
    }
    return this.findOne(savedId)
  }

  async update(id: number, dto: UpdateCustomerGroupDto): Promise<CustomerGroup> {
    const group = await this.findOne(id)
    Object.assign(group, dto)
    if (dto.rules !== undefined) {
      group.rules = (dto.rules as GroupRule[] | undefined) ?? null
    }
    await this.groupRepo.save(group)

    if (group.type === 'dynamic' && dto.rules) {
      await this.refreshDynamic(id)
    }
    return this.findOne(id)
  }

  async remove(id: number): Promise<void> {
    const group = await this.findOne(id)
    await this.memberRepo.softDelete({ groupId: id })
    await this.groupRepo.softRemove(group)
  }

  async findAll(
    page: number,
    pageSize: number,
    userId?: number,
    userRole?: string,
  ): Promise<{ list: CustomerGroup[]; total: number }> {
    const qb = this.groupRepo
      .createQueryBuilder('g')
      .orderBy('g.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (userRole === UserRole.SALES && userId) {
      qb.andWhere('g.createdById = :userId', { userId })
    }

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async findOne(id: number): Promise<CustomerGroup> {
    const group = await this.groupRepo.findOne({ where: { id } })
    if (!group) throw new NotFoundException('分组不存在')
    return group
  }

  async addMembers(groupId: number, customerIds: number[]): Promise<void> {
    const group = await this.findOne(groupId)
    if (group.type !== 'static') {
      throw new BadRequestException('只能向静态分组添加成员')
    }
    const entities = customerIds.map((customerId) =>
      this.memberRepo.create({ groupId, customerId }),
    )
    // Use INSERT IGNORE logic — skip duplicates
    await this.memberRepo
      .createQueryBuilder()
      .insert()
      .into(CustomerGroupMember)
      .values(entities)
      .orIgnore()
      .execute()

    await this.updateMemberCount(groupId)
  }

  async removeMembers(groupId: number, customerIds: number[]): Promise<void> {
    const group = await this.findOne(groupId)
    if (group.type !== 'static') {
      throw new BadRequestException('只能从静态分组移除成员')
    }
    await this.memberRepo.delete({ groupId, customerId: In(customerIds) })
    await this.updateMemberCount(groupId)
  }

  async getMembers(
    groupId: number,
    page: number,
    pageSize: number,
  ): Promise<{ list: Customer[]; total: number }> {
    const group = await this.findOne(groupId)

    if (group.type === 'dynamic' && group.rules && group.rules.length > 0) {
      const qb = this.customerRepo.createQueryBuilder('customer')
      buildGroupRuleQuery(qb, group.rules)
      qb.orderBy('customer.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
      const [list, total] = await qb.getManyAndCount()
      return { list, total }
    }

    // Static group — join members table
    const qb = this.customerRepo
      .createQueryBuilder('customer')
      .innerJoin(
        CustomerGroupMember,
        'm',
        'm.customer_id = customer.id AND m.group_id = :groupId',
        { groupId },
      )
      .andWhere('m.deleted_at IS NULL')
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async refreshDynamic(groupId: number): Promise<void> {
    const group = await this.findOne(groupId)
    if (group.type !== 'dynamic' || !group.rules || group.rules.length === 0) return

    // Get matching customer IDs
    const qb = this.customerRepo.createQueryBuilder('customer').select('customer.id')
    buildGroupRuleQuery(qb, group.rules)
    const customers = await qb.getMany()
    const customerIds = customers.map((c) => c.id)

    // Clear old members (hard delete for dynamic)
    await this.memberRepo.delete({ groupId })

    // Insert new
    if (customerIds.length > 0) {
      const batchSize = 500
      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize)
        await this.memberRepo
          .createQueryBuilder()
          .insert()
          .into(CustomerGroupMember)
          .values(batch.map((customerId) => ({ groupId, customerId })))
          .orIgnore()
          .execute()
      }
    }

    await this.groupRepo.update(groupId, {
      memberCount: customerIds.length,
      lastRefreshedAt: new Date(),
    })
  }

  @Cron('0 3 * * *')
  async batchRefreshAll(): Promise<void> {
    this.logger.log('开始批量刷新动态分组...')
    const groups = await this.groupRepo.find({ where: { type: 'dynamic' } })
    for (const group of groups) {
      try {
        await this.refreshDynamic(group.id)
      } catch (err) {
        this.logger.error(`刷新分组 ${group.id} 失败: ${err}`)
      }
    }
    this.logger.log(`批量刷新完成, 共 ${groups.length} 个动态分组`)
  }

  async batchAction(
    groupId: number,
    action: 'transfer' | 'tag' | 'notify',
    params: Record<string, unknown>,
    userId: number,
  ): Promise<{ affected: number }> {
    const { list } = await this.getMembers(groupId, 1, 10000)
    const customerIds = list.map((c) => c.id)
    if (customerIds.length === 0) return { affected: 0 }

    switch (action) {
      case 'transfer': {
        const targetUserId = params['targetUserId'] as number
        if (!targetUserId) throw new BadRequestException('缺少 targetUserId')
        await this.customerRepo.update({ id: In(customerIds) }, { assignedUserId: targetUserId })
        break
      }
      case 'tag': {
        const tag = params['tag'] as string
        if (!tag) throw new BadRequestException('缺少 tag')
        // Append tag to each customer (simple approach)
        for (const customer of list) {
          const tags = customer.tags ? [...customer.tags, tag] : [tag]
          await this.customerRepo.update(customer.id, { tags: [...new Set(tags)] })
        }
        break
      }
      case 'notify': {
        // Placeholder — notification integration would go here
        this.logger.log(`Batch notify ${customerIds.length} customers by user ${userId}`)
        break
      }
    }
    return { affected: customerIds.length }
  }

  async getAnalytics(groupId: number): Promise<{
    memberCount: number
    statusDistribution: Record<string, number>
    industryDistribution: Record<string, number>
  }> {
    const group = await this.findOne(groupId)
    const { list } = await this.getMembers(groupId, 1, 10000)

    const statusDistribution: Record<string, number> = {}
    const industryDistribution: Record<string, number> = {}

    for (const c of list) {
      statusDistribution[c.status] = (statusDistribution[c.status] || 0) + 1
      const ind = c.industry || '未知'
      industryDistribution[ind] = (industryDistribution[ind] || 0) + 1
    }

    return {
      memberCount: group.memberCount,
      statusDistribution,
      industryDistribution,
    }
  }

  private async updateMemberCount(groupId: number): Promise<void> {
    const count = await this.memberRepo.count({ where: { groupId } })
    await this.groupRepo.update(groupId, { memberCount: count })
  }
}
