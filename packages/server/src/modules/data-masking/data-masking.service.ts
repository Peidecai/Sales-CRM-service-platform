import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as crypto from 'crypto'
import { maskPhone, maskIdCard, maskEmail, maskAddress, maskByPattern } from '@crm/shared'
import { RedisService } from '../../common/redis'
import { DataMaskingRule, MaskType } from './entities/data-masking-rule.entity'
import { CreateMaskingRuleDto } from './dto/create-masking-rule.dto'
import { UpdateMaskingRuleDto } from './dto/update-masking-rule.dto'
import { QueryMaskingRuleDto } from './dto/query-masking-rule.dto'

const CACHE_KEY = 'data-masking:rules'
const CACHE_TTL = 600 // 10 minutes

@Injectable()
export class DataMaskingService {
  private readonly logger = new Logger(DataMaskingService.name)

  constructor(
    @InjectRepository(DataMaskingRule)
    private readonly ruleRepo: Repository<DataMaskingRule>,
    private readonly redisService: RedisService,
  ) {}

  async findAll(query: QueryMaskingRuleDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const qb = this.ruleRepo.createQueryBuilder('rule')

    if (query.entityName) {
      qb.andWhere('rule.entityName = :entityName', { entityName: query.entityName })
    }
    if (query.isActive !== undefined) {
      qb.andWhere('rule.isActive = :isActive', { isActive: query.isActive })
    }

    qb.orderBy('rule.createdAt', 'DESC')
    qb.skip((page - 1) * pageSize).take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async create(dto: CreateMaskingRuleDto): Promise<DataMaskingRule> {
    const rule = this.ruleRepo.create({
      ...dto,
      pattern: dto.pattern ?? null,
      exemptRoles: dto.exemptRoles ?? null,
      exemptPermission: dto.exemptPermission ?? null,
    })
    const saved = await this.ruleRepo.save(rule)
    await this.clearCache()
    return saved
  }

  async update(id: number, dto: UpdateMaskingRuleDto): Promise<DataMaskingRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } })
    if (!rule) throw new NotFoundException('脱敏规则不存在')
    Object.assign(rule, dto)
    const saved = await this.ruleRepo.save(rule)
    await this.clearCache()
    return saved
  }

  async remove(id: number): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id } })
    if (!rule) throw new NotFoundException('脱敏规则不存在')
    await this.ruleRepo.softRemove(rule)
    await this.clearCache()
  }

  async toggleStatus(id: number, isActive: boolean): Promise<DataMaskingRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } })
    if (!rule) throw new NotFoundException('脱敏规则不存在')
    rule.isActive = isActive
    const saved = await this.ruleRepo.save(rule)
    await this.clearCache()
    return saved
  }

  async getActiveRules(): Promise<DataMaskingRule[]> {
    const cached = await this.redisService.safeGet(CACHE_KEY)
    if (cached) {
      return JSON.parse(cached) as DataMaskingRule[]
    }
    const rules = await this.ruleRepo.find({ where: { isActive: true } })
    await this.redisService.set(CACHE_KEY, JSON.stringify(rules), CACHE_TTL)
    return rules
  }

  applyMasking(
    data: Record<string, unknown>,
    entityName: string,
    rules: DataMaskingRule[],
    userRole: string,
    userPermissions: string[],
  ): Record<string, unknown> {
    const entityRules = rules.filter((r) => r.entityName === entityName)
    if (entityRules.length === 0) return data

    const result = { ...data }
    for (const rule of entityRules) {
      // Check exemptions
      if (rule.exemptRoles?.includes(userRole)) continue
      if (rule.exemptPermission && userPermissions.includes(rule.exemptPermission)) continue

      const fieldValue = result[rule.fieldName]
      if (typeof fieldValue !== 'string' || !fieldValue) continue

      result[rule.fieldName] = this.maskValue(fieldValue, rule.maskType, rule.pattern)
    }
    return result
  }

  maskValue(value: string, maskType: MaskType, pattern: string | null): string {
    switch (maskType) {
      case MaskType.FULL:
        return '****'
      case MaskType.HASH:
        return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8)
      case MaskType.PARTIAL:
        if (pattern) return maskByPattern(value, pattern)
        // Auto-detect common fields
        if (value.includes('@')) return maskEmail(value)
        if (value.length >= 15) return maskIdCard(value)
        if (value.length >= 7) return maskPhone(value)
        return maskAddress(value)
      default:
        return value
    }
  }

  preview(value: string, maskType: MaskType, pattern: string | null): string {
    return this.maskValue(value, maskType, pattern)
  }

  private async clearCache(): Promise<void> {
    await this.redisService.del(CACHE_KEY)
  }
}
