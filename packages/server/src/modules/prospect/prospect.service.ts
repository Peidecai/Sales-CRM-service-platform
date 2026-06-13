import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource, In, SelectQueryBuilder } from 'typeorm'
import { Prospect } from './prospect.entity'
import { ProspectSearchLog } from './entities/prospect-search-log.entity'
import { ProspectQueryHistory } from './entities/prospect-query-history.entity'
import { Customer } from '../customer/customer.entity'
import { MockProspectAdapter } from './adapters/mock.adapter'
import { TianyanchaAdapter } from './adapters/tianyancha.adapter'
import { QichachaAdapter } from './adapters/qichacha.adapter'
import type { IProspectAdapter, DataSourceCredentials } from './adapters/prospect-adapter.interface'
import { SearchProspectDto } from './dto/search-prospect.dto'
import { QueryProspectDto } from './dto/query-prospect.dto'
import { UpdateProspectDto } from './dto/update-prospect.dto'
import { ConvertProspectDto } from './dto/convert-prospect.dto'
import { BatchOperationDto } from './dto/batch-operation.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis'
import { ProspectConfigService } from './prospect-config.service'
import {
  ProspectChannel,
  ProspectStatus,
  CustomerStatus,
  CustomerSource,
  UserRole,
} from '@crm/shared'
import type { ProspectSearchResult } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

/** 搜索结果 + 查重标记 */
export interface SearchResultWithDuplicate extends ProspectSearchResult {
  isDuplicate: boolean
  existingCustomerId?: number
}

@Injectable()
export class ProspectService {
  private readonly logger = new Logger(ProspectService.name)
  private readonly adapters: IProspectAdapter[]

  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepository: Repository<Prospect>,
    @InjectRepository(ProspectSearchLog)
    private readonly searchLogRepository: Repository<ProspectSearchLog>,
    @InjectRepository(ProspectQueryHistory)
    private readonly queryHistoryRepository: Repository<ProspectQueryHistory>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly prospectConfigService: ProspectConfigService,
    mockAdapter: MockProspectAdapter,
    tianyanchaAdapter: TianyanchaAdapter,
    qichachaAdapter: QichachaAdapter,
  ) {
    this.adapters = [mockAdapter, tianyanchaAdapter, qichachaAdapter]
  }

  /* ========== 搜索 ========== */

  async search(
    dto: SearchProspectDto,
    user: AuthUser,
  ): Promise<{ results: SearchResultWithDuplicate[]; total: number }> {
    // 数据源优先级：后台配置 > 环境变量适配器 > Mock，保证未配置真实渠道时功能仍可演示。
    const { adapter, dbSourceId, credentials } = await this.getAvailableAdapter()

    const { results, total, cost } = await adapter.search(
      {
        keyword: dto.keyword,
        industry: dto.industry,
        province: dto.province,
        city: dto.city,
        minRegisteredCapital: dto.minRegisteredCapital,
        maxRegisteredCapital: dto.maxRegisteredCapital,
        minEmployeeCount: dto.minEmployeeCount,
        maxEmployeeCount: dto.maxEmployeeCount,
        page: dto.page,
        pageSize: dto.pageSize,
      },
      credentials,
    )

    // 使用量统计不影响搜索结果返回，失败只记录告警。
    if (dbSourceId !== null) {
      this.prospectConfigService
        .incrementUsage(dbSourceId)
        .catch((err) =>
          this.logger.warn(`Failed to increment usage for source ${dbSourceId}: ${String(err)}`),
        )
    }

    // 搜索结果只标记已存在客户，不在搜索阶段写入线索池。
    const resultsWithDuplicate = await this.markDuplicates(results)

    // 日志写入 fire-and-forget，避免审计辅助数据阻塞主查询。
    this.logSearch(user.id, adapter.channel, dto, total, cost).catch((err) =>
      this.logger.warn(`Failed to log search: ${String(err)}`),
    )

    // 查询历史同样不影响搜索主链路。
    this.saveQueryHistory(user.id, dto as unknown as Record<string, unknown>, total).catch((err) =>
      this.logger.warn(`Failed to save query history: ${String(err)}`),
    )

    return { results: resultsWithDuplicate, total }
  }

  /* ========== 导入到线索池 ========== */

  async importToPool(
    results: ProspectSearchResult[],
    user: AuthUser,
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0
    let skipped = 0
    const batchId = `batch-${Date.now()}-${user.id}`

    for (const item of results) {
      // 线索池按“来源渠道 + 统一信用代码/企业名”去重，不跨渠道合并第三方数据。
      const exists = await this.checkProspectExists(item)
      if (exists) {
        skipped++
        continue
      }

      const prospect = this.prospectRepository.create({
        companyName: item.companyName,
        legalPerson: item.legalPerson ?? null,
        registeredCapital: item.registeredCapital ?? null,
        establishDate: item.establishDate ?? null,
        industry: item.industry ?? null,
        province: item.province ?? null,
        city: item.city ?? null,
        address: item.address ?? null,
        unifiedCreditCode: item.unifiedCreditCode ?? null,
        phone: item.phone ?? null,
        email: item.email ?? null,
        website: item.website ?? null,
        employeeCount: item.employeeCount ?? null,
        businessScope: item.businessScope ?? null,
        channel: item.channel as ProspectChannel,
        status: ProspectStatus.NEW,
        assignedUserId: user.id,
        searchBatchId: batchId,
      })

      await this.prospectRepository.save(prospect)
      imported++
    }

    await this.invalidateListCache()
    await this.invalidateStatsCache()
    return { imported, skipped }
  }

  /* ========== 线索池列表 ========== */

  async findAll(
    query: QueryProspectDto,
    user: AuthUser,
  ): Promise<{ list: Prospect[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, status, channel, industry, sortBy, sortOrder } = query

    // 列表缓存必须包含角色和用户，避免销售之间看到彼此的数据。
    const cacheKey = `${CACHE_KEYS.PROSPECT_LIST}:${JSON.stringify({
      page,
      pageSize,
      keyword,
      status,
      channel,
      industry,
      sortBy,
      sortOrder,
      _role: user.role,
      _uid: user.id,
    })}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as { list: Prospect[]; total: number }
    }

    const qb = this.prospectRepository.createQueryBuilder('prospect')

    this.applyDataPermission(qb, user)

    if (keyword) {
      qb.andWhere('prospect.companyName LIKE :kw', { kw: `%${keyword}%` })
    }
    if (status) {
      qb.andWhere('prospect.status = :status', { status })
    }
    if (channel) {
      qb.andWhere('prospect.channel = :channel', { channel })
    }
    if (industry) {
      qb.andWhere('prospect.industry = :industry', { industry })
    }

    const orderField = sortBy ?? 'createdAt'
    const orderDir = sortOrder ?? 'DESC'
    qb.orderBy(`prospect.${orderField}`, orderDir)
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    const result = { list, total }

    await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL.PROSPECT_LIST)
    return result
  }

  /* ========== 线索详情 ========== */

  async findOne(id: number, user?: AuthUser): Promise<Prospect> {
    const cacheKey = `${CACHE_KEYS.PROSPECT_DETAIL}:${id}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      const prospect = JSON.parse(cached) as Prospect
      // 详情缓存不按用户分片，命中后仍要做所有权校验。
      this.checkOwnership(prospect, user)
      return prospect
    }

    const prospect = await this.prospectRepository.findOne({ where: { id } })
    if (!prospect) {
      throw new NotFoundException(`Prospect with ID ${id} not found`)
    }
    this.checkOwnership(prospect, user)

    await this.redisService.set(cacheKey, JSON.stringify(prospect), CACHE_TTL.PROSPECT_DETAIL)
    return prospect
  }

  /* ========== 更新 ========== */

  async update(id: number, dto: UpdateProspectDto, user: AuthUser): Promise<Prospect> {
    const prospect = await this.findOne(id, user)

    if (dto.status && prospect.status === ProspectStatus.CONVERTED) {
      throw new BadRequestException('已转化的线索不可修改状态')
    }

    Object.assign(prospect, dto)
    const saved = await this.prospectRepository.save(prospect)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    await this.invalidateStatsCache()
    return saved
  }

  /* ========== 转化为客户 ========== */

  async convert(
    dto: ConvertProspectDto,
    user: AuthUser,
  ): Promise<{ convertedCount: number; customerIds: number[] }> {
    const customerIds: number[] = []
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      for (const prospectId of dto.prospectIds) {
        const prospect = await queryRunner.manager.findOne(Prospect, { where: { id: prospectId } })
        if (!prospect) {
          throw new NotFoundException(`Prospect with ID ${prospectId} not found`)
        }
        if (prospect.status === ProspectStatus.CONVERTED) {
          throw new BadRequestException(`线索 ${prospect.companyName} 已转化`)
        }

        // 转客户与线索状态更新在同一事务内，避免出现客户已建但线索未标记的半转换状态。
        const customer = queryRunner.manager.create(Customer, {
          name: prospect.companyName,
          company: prospect.companyName,
          phone: prospect.phone ?? undefined,
          email: prospect.email ?? undefined,
          status: CustomerStatus.LEAD,
          source: CustomerSource.PROSPECT,
          assignedUserId: dto.assignedUserId ?? prospect.assignedUserId ?? user.id,
          industry: prospect.industry ?? undefined,
          address: prospect.address ?? undefined,
          website: prospect.website ?? undefined,
          legalPerson: prospect.legalPerson ?? undefined,
          unifiedCreditCode: prospect.unifiedCreditCode ?? undefined,
          employeeCount: prospect.employeeCount ?? undefined,
        })
        const savedCustomer = await queryRunner.manager.save(Customer, customer)
        customerIds.push(savedCustomer.id)

        // 更新线索状态
        prospect.status = ProspectStatus.CONVERTED
        prospect.convertedCustomerId = savedCustomer.id
        prospect.convertedAt = new Date()
        await queryRunner.manager.save(Prospect, prospect)
      }

      await queryRunner.commitTransaction()
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }

    // 转换会影响线索列表、统计和客户列表，相关缓存需要一起失效。
    await this.invalidateListCache()
    await this.invalidateStatsCache()
    await this.redisService.delByPattern('cache:customers:list:*')

    return { convertedCount: customerIds.length, customerIds }
  }

  /* ========== 批量操作 ========== */

  async batchOperate(dto: BatchOperationDto, user: AuthUser): Promise<{ affected: number }> {
    switch (dto.action) {
      case 'assign':
        return this.batchAssign(dto.ids, dto.assignedUserId!, user)
      case 'reject':
        return this.batchReject(dto.ids, user)
      case 'delete':
        return this.batchDelete(dto.ids, user)
      default:
        throw new BadRequestException(`Unknown action: ${dto.action as string}`)
    }
  }

  async batchAssign(
    ids: number[],
    assignedUserId: number,
    _user: AuthUser,
  ): Promise<{ affected: number }> {
    if (!assignedUserId) {
      throw new BadRequestException('批量分配需要指定销售ID')
    }
    const result = await this.prospectRepository.update(
      {
        id: In(ids),
        status: In([ProspectStatus.NEW, ProspectStatus.CONTACTED, ProspectStatus.QUALIFIED]),
      },
      { assignedUserId },
    )
    await this.invalidateListCache()
    return { affected: result.affected ?? 0 }
  }

  async batchReject(ids: number[], _user: AuthUser): Promise<{ affected: number }> {
    const result = await this.prospectRepository.update(
      {
        id: In(ids),
        status: In([ProspectStatus.NEW, ProspectStatus.CONTACTED, ProspectStatus.QUALIFIED]),
      },
      { status: ProspectStatus.REJECTED },
    )
    await this.invalidateListCache()
    await this.invalidateStatsCache()
    return { affected: result.affected ?? 0 }
  }

  private async batchDelete(ids: number[], _user: AuthUser): Promise<{ affected: number }> {
    const prospects = await this.prospectRepository.find({ where: { id: In(ids) } })
    if (prospects.length === 0) return { affected: 0 }
    await this.prospectRepository.softRemove(prospects)
    await this.invalidateListCache()
    await this.invalidateStatsCache()
    return { affected: prospects.length }
  }

  /* ========== 删除 ========== */

  async remove(id: number, user: AuthUser): Promise<void> {
    const prospect = await this.findOne(id, user)
    await this.prospectRepository.softRemove(prospect)
    await this.invalidateListCache()
    await this.invalidateDetailCache(id)
    await this.invalidateStatsCache()
  }

  /* ========== 搜索历史 ========== */

  async getSearchHistory(user: AuthUser): Promise<ProspectSearchLog[]> {
    return this.searchLogRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 50,
    })
  }

  /* ========== 查询历史 ========== */

  async getQueryHistory(
    userId: number,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: ProspectQueryHistory[]; total: number }> {
    const [list, total] = await this.queryHistoryRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total }
  }

  async deleteQueryHistory(id: number, userId: number): Promise<void> {
    const history = await this.queryHistoryRepository.findOne({ where: { id, userId } })
    if (!history) throw new NotFoundException(`Query history ${id} not found`)
    await this.queryHistoryRepository.remove(history)
  }

  async saveQueryHistory(
    userId: number,
    queryParams: Record<string, unknown>,
    resultCount: number,
  ): Promise<void> {
    const entry = this.queryHistoryRepository.create({ userId, queryParams, resultCount })
    await this.queryHistoryRepository.save(entry)
  }

  /* ========== 统计 ========== */

  async getStats(user: AuthUser): Promise<{
    total: number
    newCount: number
    contactedCount: number
    qualifiedCount: number
    convertedCount: number
    rejectedCount: number
    conversionRate: number
  }> {
    const cacheKey = `${CACHE_KEYS.PROSPECT_STATS}:${user.role}:${user.id}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) {
      return JSON.parse(cached) as ReturnType<ProspectService['getStats']> extends Promise<infer T>
        ? T
        : never
    }

    const qb = this.prospectRepository.createQueryBuilder('prospect')
    this.applyDataPermission(qb, user)

    const total = await qb.getCount()

    const statusCounts = await this.prospectRepository
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(user.role === UserRole.SALES ? 'p.assignedUserId = :uid' : '1=1', { uid: user.id })
      .groupBy('p.status')
      .getRawMany<{ status: string; count: string }>()

    const countMap: Record<string, number> = {}
    for (const row of statusCounts) {
      countMap[row.status] = parseInt(row.count, 10)
    }

    const newCount = countMap[ProspectStatus.NEW] ?? 0
    const contactedCount = countMap[ProspectStatus.CONTACTED] ?? 0
    const qualifiedCount = countMap[ProspectStatus.QUALIFIED] ?? 0
    const convertedCount = countMap[ProspectStatus.CONVERTED] ?? 0
    const rejectedCount = countMap[ProspectStatus.REJECTED] ?? 0
    const conversionRate = total > 0 ? Math.round((convertedCount / total) * 10000) / 100 : 0

    const stats = {
      total,
      newCount,
      contactedCount,
      qualifiedCount,
      convertedCount,
      rejectedCount,
      conversionRate,
    }
    await this.redisService.set(cacheKey, JSON.stringify(stats), CACHE_TTL.PROSPECT_STATS)
    return stats
  }

  /* ========== 私有方法 ========== */

  private async getAvailableAdapter(channelOverride?: ProspectChannel): Promise<{
    adapter: IProspectAdapter
    dbSourceId: number | null
    credentials: DataSourceCredentials | undefined
  }> {
    // 指定真实渠道时优先使用后台启用的数据源配置。
    if (channelOverride && channelOverride !== ProspectChannel.MOCK) {
      const result = await this.prospectConfigService.getConfiguredAdapter(channelOverride)
      if (result) {
        return {
          adapter: result.adapter,
          dbSourceId: result.source.id,
          credentials: result.credentials,
        }
      }
    }

    // 未指定渠道时按固定顺序选择可用真实渠道，避免随机切换导致结果不可复现。
    if (!channelOverride) {
      for (const channel of [
        ProspectChannel.TIANYANCHA,
        ProspectChannel.QICHACHA,
      ] as ProspectChannel[]) {
        const result = await this.prospectConfigService.getConfiguredAdapter(channel)
        if (result) {
          return {
            adapter: result.adapter,
            dbSourceId: result.source.id,
            credentials: result.credentials,
          }
        }
      }
    }

    // 数据库未配置时退回本地注册适配器，兼容环境变量部署。
    const real = this.adapters.find((a) => a.channel !== ProspectChannel.MOCK && a.isAvailable())
    if (real) return { adapter: real, dbSourceId: null, credentials: undefined }

    // 最后退回 Mock，保证开发和演示环境没有外部密钥也能运行。
    const mock = this.adapters.find((a) => a.channel === ProspectChannel.MOCK)
    if (mock) return { adapter: mock, dbSourceId: null, credentials: undefined }

    throw new BadRequestException('无可用的数据源适配器')
  }

  private async markDuplicates(
    results: ProspectSearchResult[],
  ): Promise<SearchResultWithDuplicate[]> {
    if (results.length === 0) return []

    // 先批量收集查重键，避免每条搜索结果分别查询客户表。
    const codes = results.map((r) => r.unifiedCreditCode).filter((c): c is string => !!c)
    const names = results.map((r) => r.companyName)

    // 统一信用代码优先于名称，名称只作为缺少代码时的兜底查重。
    const existingByCode =
      codes.length > 0
        ? await this.customerRepository
            .createQueryBuilder('c')
            .where('c.unifiedCreditCode IN (:...codes)', { codes })
            .getMany()
        : []

    const existingByName = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.company IN (:...names) OR c.name IN (:...names)', { names })
      .getMany()

    const codeMap = new Map<string, number>()
    for (const c of existingByCode) {
      if (c.unifiedCreditCode) codeMap.set(c.unifiedCreditCode, c.id)
    }

    const nameMap = new Map<string, number>()
    for (const c of existingByName) {
      nameMap.set(c.company, c.id)
      nameMap.set(c.name, c.id)
    }

    return results.map((r) => {
      let existingCustomerId: number | undefined
      let isDuplicate = false

      if (r.unifiedCreditCode && codeMap.has(r.unifiedCreditCode)) {
        isDuplicate = true
        existingCustomerId = codeMap.get(r.unifiedCreditCode)
      } else if (nameMap.has(r.companyName)) {
        isDuplicate = true
        existingCustomerId = nameMap.get(r.companyName)
      }

      return { ...r, isDuplicate, existingCustomerId }
    })
  }

  private async checkProspectExists(item: ProspectSearchResult): Promise<boolean> {
    if (item.unifiedCreditCode) {
      const existing = await this.prospectRepository.findOne({
        where: {
          unifiedCreditCode: item.unifiedCreditCode,
          channel: item.channel as ProspectChannel,
        },
      })
      if (existing) return true
    }

    const byName = await this.prospectRepository.findOne({
      where: {
        companyName: item.companyName,
        channel: item.channel as ProspectChannel,
      },
    })
    return !!byName
  }

  private async logSearch(
    userId: number,
    channel: ProspectChannel,
    query: SearchProspectDto,
    resultCount: number,
    cost: number,
  ): Promise<void> {
    const log = this.searchLogRepository.create({
      userId,
      channel,
      query: query as unknown as Record<string, unknown>,
      resultCount,
      importedCount: 0,
      cost,
      status: 'completed',
    })
    await this.searchLogRepository.save(log)
  }

  private applyDataPermission(qb: SelectQueryBuilder<Prospect>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('prospect.assignedUserId = :currentUserId', { currentUserId: user.id })
    }
  }

  private checkOwnership(prospect: Prospect, user?: AuthUser): void {
    if (user && user.role === UserRole.SALES && prospect.assignedUserId !== user.id) {
      throw new ForbiddenException('您无权访问此线索')
    }
  }

  async invalidateListCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.PROSPECT_LIST}:*`)
  }

  async invalidateDetailCache(id: number): Promise<void> {
    await this.redisService.del(`${CACHE_KEYS.PROSPECT_DETAIL}:${id}`)
  }

  async invalidateStatsCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.PROSPECT_STATS}:*`)
  }
}
