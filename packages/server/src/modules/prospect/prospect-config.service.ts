import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ProspectDataSource } from './entities/prospect-data-source.entity'
import { ProspectSearchTemplate } from './entities/prospect-search-template.entity'
import { ProspectFilterConfig } from './entities/prospect-filter-config.entity'
import { CreateDataSourceDto } from './dto/create-data-source.dto'
import { UpdateDataSourceDto } from './dto/update-data-source.dto'
import { CreateSearchTemplateDto } from './dto/create-search-template.dto'
import { UpdateFilterConfigDto } from './dto/update-filter-config.dto'
import { TianyanchaAdapter } from './adapters/tianyancha.adapter'
import { QichachaAdapter } from './adapters/qichacha.adapter'
import type { DataSourceCredentials } from './adapters/prospect-adapter.interface'
import { RedisService } from '../../common/redis/redis.service'
import { CACHE_KEYS, CACHE_TTL } from '../../common/redis/cache-keys'
import { ProspectChannel, UserRole } from '@crm/shared'

const DEFAULT_ENABLED_FILTERS = [
  'keyword',
  'industry',
  'province',
  'city',
  'registeredCapital',
  'employeeCount',
  'establishDate',
  'businessStatus',
]

/** VO returned to frontend — sensitive fields masked */
export interface DataSourceVO {
  id: number
  name: string
  channel: ProspectChannel
  apiKeyMasked: string
  hasApiSecret: boolean
  apiEndpoint: string | null
  isEnabled: boolean
  dailyQuota: number
  usedToday: number
  totalUsed: number
  lastCalledAt: Date | null
  config: Record<string, unknown> | null
  remark: string | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class ProspectConfigService {
  private readonly logger = new Logger(ProspectConfigService.name)

  constructor(
    @InjectRepository(ProspectDataSource)
    private readonly dataSourceRepo: Repository<ProspectDataSource>,
    @InjectRepository(ProspectSearchTemplate)
    private readonly templateRepo: Repository<ProspectSearchTemplate>,
    @InjectRepository(ProspectFilterConfig)
    private readonly filterConfigRepo: Repository<ProspectFilterConfig>,
    private readonly tianyanchaAdapter: TianyanchaAdapter,
    private readonly qichachaAdapter: QichachaAdapter,
    private readonly redisService: RedisService,
  ) {}

  // ===== Data Sources =====

  /** Returns masked data sources (apiKey/apiSecret never exposed to frontend) */
  async getDataSources(): Promise<DataSourceVO[]> {
    const cacheKey = CACHE_KEYS.PROSPECT_DATA_SOURCES
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) return JSON.parse(cached) as DataSourceVO[]

    const sources = await this.dataSourceRepo.find({ order: { createdAt: 'ASC' } })
    const masked = sources.map((s) => this.maskDataSource(s))
    await this.redisService.set(cacheKey, JSON.stringify(masked), CACHE_TTL.PROSPECT_DATA_SOURCES)
    return masked
  }

  async createDataSource(dto: CreateDataSourceDto): Promise<DataSourceVO> {
    const existing = await this.dataSourceRepo.findOne({ where: { channel: dto.channel } })
    if (existing) {
      throw new BadRequestException(`渠道 ${dto.channel} 的数据源已存在`)
    }
    const source = this.dataSourceRepo.create(dto)
    const saved = await this.dataSourceRepo.save(source)
    await this.invalidateDataSourceCache()
    return this.maskDataSource(saved)
  }

  async updateDataSource(id: number, dto: UpdateDataSourceDto): Promise<DataSourceVO> {
    const source = await this.dataSourceRepo.findOne({ where: { id } })
    if (!source) throw new NotFoundException('数据源不存在')
    // Guard: if channel is being changed, check for duplicates
    if (dto.channel && dto.channel !== source.channel) {
      const existing = await this.dataSourceRepo.findOne({ where: { channel: dto.channel } })
      if (existing) {
        throw new BadRequestException(`渠道 ${dto.channel} 的数据源已存在`)
      }
    }
    Object.assign(source, dto)
    const saved = await this.dataSourceRepo.save(source)
    await this.invalidateDataSourceCache()
    return this.maskDataSource(saved)
  }

  async deleteDataSource(id: number): Promise<void> {
    const source = await this.dataSourceRepo.findOne({ where: { id } })
    if (!source) throw new NotFoundException('数据源不存在')
    // H2: use softRemove since entity extends BaseEntity with deletedAt
    await this.dataSourceRepo.softRemove(source)
    await this.invalidateDataSourceCache()
  }

  async testDataSource(id: number): Promise<{ success: boolean; message: string }> {
    const source = await this.dataSourceRepo.findOne({ where: { id } })
    if (!source) throw new NotFoundException('数据源不存在')

    const adapter = this.getAdapterForChannel(source.channel)
    if (!adapter) {
      return { success: false, message: `不支持的渠道: ${source.channel}` }
    }

    const creds: DataSourceCredentials = {
      apiKey: source.apiKey,
      apiSecret: source.apiSecret ?? undefined,
      apiEndpoint: source.apiEndpoint ?? undefined,
    }

    try {
      // C2: pass credentials per-call, no shared mutable state
      const ok = await adapter.testConnection!(creds)
      return ok
        ? { success: true, message: '连接成功' }
        : { success: false, message: '连接失败，请检查 API Key' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误'
      return { success: false, message }
    }
  }

  /** Get an enabled data source by channel, returning credentials for per-call injection */
  async getConfiguredAdapter(channel: ProspectChannel): Promise<{
    adapter: TianyanchaAdapter | QichachaAdapter
    source: ProspectDataSource
    credentials: DataSourceCredentials
  } | null> {
    const source = await this.dataSourceRepo.findOne({
      where: { channel, isEnabled: true },
    })
    if (!source) return null

    // Check daily quota
    if (source.dailyQuota > 0 && source.usedToday >= source.dailyQuota) {
      this.logger.warn(`数据源 ${source.name} 已达每日配额限制 (${source.dailyQuota})`)
      return null
    }

    const adapter = this.getAdapterForChannel(channel)
    if (!adapter) return null

    const credentials: DataSourceCredentials = {
      apiKey: source.apiKey,
      apiSecret: source.apiSecret ?? undefined,
      apiEndpoint: source.apiEndpoint ?? undefined,
    }

    return { adapter, source, credentials }
  }

  /** Increment usage counters after a successful API call (M1: single query) */
  async incrementUsage(sourceId: number): Promise<void> {
    await this.dataSourceRepo
      .createQueryBuilder()
      .update(ProspectDataSource)
      .set({
        usedToday: () => 'used_today + 1',
        totalUsed: () => 'total_used + 1',
        lastCalledAt: new Date(),
      })
      .where('id = :id', { id: sourceId })
      .execute()
    await this.invalidateDataSourceCache()
  }

  /** H4: Reset usedToday counter at midnight every day */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyUsage(): Promise<void> {
    this.logger.log('Resetting daily usage counters for all data sources')
    await this.dataSourceRepo
      .createQueryBuilder()
      .update(ProspectDataSource)
      .set({ usedToday: 0 })
      .where('usedToday > 0')
      .execute()
    await this.invalidateDataSourceCache()
  }

  // ===== Search Templates =====

  async getSearchTemplates(userId: number, _role: string): Promise<ProspectSearchTemplate[]> {
    const cacheKey = `${CACHE_KEYS.PROSPECT_SEARCH_TEMPLATES}:${userId}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) return JSON.parse(cached) as ProspectSearchTemplate[]

    const qb = this.templateRepo.createQueryBuilder('t')
    qb.where('t.userId = :userId', { userId })
      .orWhere('t.isShared = :shared', { shared: true })
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.createdAt', 'DESC')

    const templates = await qb.getMany()
    await this.redisService.set(
      cacheKey,
      JSON.stringify(templates),
      CACHE_TTL.PROSPECT_SEARCH_TEMPLATES,
    )
    return templates
  }

  async createSearchTemplate(
    userId: number,
    dto: CreateSearchTemplateDto,
  ): Promise<ProspectSearchTemplate> {
    const template = this.templateRepo.create({ ...dto, userId })
    const saved = await this.templateRepo.save(template)
    await this.invalidateTemplateCache()
    return saved
  }

  /** M3: Admin can update any template; others can only update their own */
  async updateSearchTemplate(
    id: number,
    userId: number,
    role: string,
    dto: Partial<CreateSearchTemplateDto>,
  ): Promise<ProspectSearchTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } })
    if (!template) throw new NotFoundException('搜索模板不存在')
    if (role !== UserRole.ADMIN && template.userId !== userId) {
      throw new BadRequestException('无权修改此模板')
    }
    Object.assign(template, dto)
    const saved = await this.templateRepo.save(template)
    await this.invalidateTemplateCache()
    return saved
  }

  /** M3: Admin can delete any template; others can only delete their own */
  async deleteSearchTemplate(id: number, userId: number, role: string): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { id } })
    if (!template) throw new NotFoundException('搜索模板不存在')
    if (role !== UserRole.ADMIN && template.userId !== userId) {
      throw new BadRequestException('无权删除此模板')
    }
    await this.templateRepo.remove(template)
    await this.invalidateTemplateCache()
  }

  // ===== Filter Config =====

  async getFilterConfig(): Promise<ProspectFilterConfig> {
    const cached = await this.redisService.safeGet(CACHE_KEYS.PROSPECT_FILTER_CONFIG)
    if (cached) return JSON.parse(cached) as ProspectFilterConfig

    let config = await this.filterConfigRepo.findOne({ where: { id: 1 } })
    if (!config) {
      config = this.filterConfigRepo.create({
        id: 1,
        enabledFilters: DEFAULT_ENABLED_FILTERS,
        customFilters: [],
        updatedBy: 0,
      })
      await this.filterConfigRepo.save(config)
    }

    await this.redisService.set(
      CACHE_KEYS.PROSPECT_FILTER_CONFIG,
      JSON.stringify(config),
      CACHE_TTL.PROSPECT_FILTER_CONFIG,
    )
    return config
  }

  async updateFilterConfig(
    dto: UpdateFilterConfigDto,
    userId: number,
  ): Promise<ProspectFilterConfig> {
    let config = await this.filterConfigRepo.findOne({ where: { id: 1 } })
    if (!config) {
      config = this.filterConfigRepo.create({
        id: 1,
        enabledFilters: dto.enabledFilters,
        customFilters: dto.customFilters || [],
        updatedBy: userId,
      })
    } else {
      config.enabledFilters = dto.enabledFilters
      config.customFilters = dto.customFilters || config.customFilters
      config.updatedBy = userId
    }
    const saved = await this.filterConfigRepo.save(config)
    await this.redisService.del(CACHE_KEYS.PROSPECT_FILTER_CONFIG)
    return saved
  }

  // ===== Private helpers =====

  private getAdapterForChannel(
    channel: ProspectChannel,
  ): TianyanchaAdapter | QichachaAdapter | null {
    if (channel === ProspectChannel.TIANYANCHA) return this.tianyanchaAdapter
    if (channel === ProspectChannel.QICHACHA) return this.qichachaAdapter
    return null
  }

  /** C3/M2: Mask sensitive fields — never expose raw API keys */
  private maskDataSource(source: ProspectDataSource): DataSourceVO {
    return {
      id: source.id,
      name: source.name,
      channel: source.channel,
      apiKeyMasked: maskSecret(source.apiKey),
      hasApiSecret: !!source.apiSecret,
      apiEndpoint: source.apiEndpoint,
      isEnabled: source.isEnabled,
      dailyQuota: source.dailyQuota,
      usedToday: source.usedToday,
      totalUsed: source.totalUsed,
      lastCalledAt: source.lastCalledAt,
      config: source.config,
      remark: source.remark,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    }
  }

  private async invalidateDataSourceCache(): Promise<void> {
    await this.redisService.del(CACHE_KEYS.PROSPECT_DATA_SOURCES)
  }

  private async invalidateTemplateCache(): Promise<void> {
    await this.redisService.delByPattern(`${CACHE_KEYS.PROSPECT_SEARCH_TEMPLATES}:*`)
  }
}

/** Show only last 4 chars: "sk-abc...xyz1234" → "****1234" */
function maskSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (value.length <= 4) return '****'
  return '****' + value.slice(-4)
}
