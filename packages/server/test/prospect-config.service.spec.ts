import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ProspectConfigService } from '../src/modules/prospect/prospect-config.service'
import { ProspectDataSource } from '../src/modules/prospect/entities/prospect-data-source.entity'
import { ProspectSearchTemplate } from '../src/modules/prospect/entities/prospect-search-template.entity'
import { ProspectFilterConfig } from '../src/modules/prospect/entities/prospect-filter-config.entity'
import { TianyanchaAdapter } from '../src/modules/prospect/adapters/tianyancha.adapter'
import { QichachaAdapter } from '../src/modules/prospect/adapters/qichacha.adapter'
import { RedisService } from '../src/common/redis'
import { CACHE_KEYS, CACHE_TTL } from '../src/common/redis/cache-keys'
import { ProspectChannel } from '@crm/shared'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
} from './test-utils'

describe('ProspectConfigService', () => {
  let service: ProspectConfigService
  let dataSourceRepo: MockRepository<ProspectDataSource>
  let templateRepo: MockRepository<ProspectSearchTemplate>
  let filterConfigRepo: MockRepository<ProspectFilterConfig>
  let redisService: MockRedisService
  let tianyanchaAdapter: jest.Mocked<Pick<TianyanchaAdapter, 'channel' | 'testConnection' | 'search' | 'isAvailable'>>
  let qichachaAdapter: jest.Mocked<Pick<QichachaAdapter, 'channel' | 'testConnection' | 'search' | 'isAvailable'>>

  // ---------- Fixtures ----------

  const dataSourceFixture = (overrides: Record<string, unknown> = {}): ProspectDataSource =>
    ({
      id: 1,
      name: '天眼查',
      channel: ProspectChannel.TIANYANCHA,
      apiKey: 'test-api-key',
      apiSecret: null,
      apiEndpoint: null,
      isEnabled: true,
      dailyQuota: 0,
      usedToday: 0,
      totalUsed: 0,
      lastCalledAt: null,
      config: null,
      remark: null,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      ...overrides,
    }) as ProspectDataSource

  const templateFixture = (overrides: Record<string, unknown> = {}): ProspectSearchTemplate =>
    ({
      id: 1,
      name: '北京科技企业',
      userId: 1,
      conditions: { keyword: '科技', province: '北京' },
      isShared: false,
      sortOrder: 0,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      ...overrides,
    }) as unknown as ProspectSearchTemplate

  const filterConfigFixture = (overrides: Record<string, unknown> = {}): ProspectFilterConfig =>
    ({
      id: 1,
      enabledFilters: ['keyword', 'industry', 'province'],
      customFilters: [],
      updatedBy: 1,
      updatedAt: new Date('2025-01-01'),
      ...overrides,
    }) as ProspectFilterConfig

  // ---------- Setup ----------

  beforeEach(async () => {
    dataSourceRepo = createMockRepository<ProspectDataSource>()
    templateRepo = createMockRepository<ProspectSearchTemplate>()
    filterConfigRepo = createMockRepository<ProspectFilterConfig>()
    redisService = createMockRedisService()

    tianyanchaAdapter = {
      channel: ProspectChannel.TIANYANCHA,
      testConnection: jest.fn(),
      search: jest.fn(),
      isAvailable: jest.fn(),
    }

    qichachaAdapter = {
      channel: ProspectChannel.QICHACHA,
      testConnection: jest.fn(),
      search: jest.fn(),
      isAvailable: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectConfigService,
        { provide: getRepositoryToken(ProspectDataSource), useValue: dataSourceRepo },
        { provide: getRepositoryToken(ProspectSearchTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(ProspectFilterConfig), useValue: filterConfigRepo },
        { provide: TianyanchaAdapter, useValue: tianyanchaAdapter },
        { provide: QichachaAdapter, useValue: qichachaAdapter },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile()

    service = module.get(ProspectConfigService)
  })

  // ===== Data Sources =====

  describe('getDataSources', () => {
    it('should return cached data when cache hit', async () => {
      const maskedSources = [{ ...dataSourceFixture(), apiKey: undefined, apiKeyMasked: '****-key' }]
      redisService.safeGet.mockResolvedValue(JSON.stringify(maskedSources))

      const result = await service.getDataSources()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('天眼查')
      expect(dataSourceRepo.find).not.toHaveBeenCalled()
    })

    it('should query DB and cache result on cache miss', async () => {
      const sources = [dataSourceFixture()]
      redisService.safeGet.mockResolvedValue(null)
      dataSourceRepo.find.mockResolvedValue(sources)

      const result = await service.getDataSources()

      expect(result).toHaveLength(1)
      expect(dataSourceRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } })
      expect(redisService.set).toHaveBeenCalledWith(
        CACHE_KEYS.PROSPECT_DATA_SOURCES,
        expect.any(String),
        CACHE_TTL.PROSPECT_DATA_SOURCES,
      )
    })
  })

  describe('createDataSource', () => {
    it('should create data source and invalidate cache', async () => {
      const dto = {
        name: '企查查',
        channel: ProspectChannel.QICHACHA,
        apiKey: 'qichacha-key',
      }
      const created = dataSourceFixture({ ...dto, id: 2, channel: ProspectChannel.QICHACHA })

      dataSourceRepo.findOne.mockResolvedValue(null)
      dataSourceRepo.create.mockReturnValue(created)
      dataSourceRepo.save.mockResolvedValue(created)

      const result = await service.createDataSource(dto as never)

      expect(result.name).toBe('企查查')
      expect(dataSourceRepo.create).toHaveBeenCalledWith(dto)
      expect(dataSourceRepo.save).toHaveBeenCalledWith(created)
      expect(redisService.del).toHaveBeenCalledWith(CACHE_KEYS.PROSPECT_DATA_SOURCES)
    })

    it('should throw BadRequestException when channel already exists', async () => {
      dataSourceRepo.findOne.mockResolvedValue(dataSourceFixture())

      await expect(
        service.createDataSource({
          name: '天眼查2',
          channel: ProspectChannel.TIANYANCHA,
          apiKey: 'another-key',
        } as never),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('updateDataSource', () => {
    it('should update data source and invalidate cache', async () => {
      const source = dataSourceFixture()
      const updated = dataSourceFixture({ isEnabled: false })

      dataSourceRepo.findOne.mockResolvedValue(source)
      dataSourceRepo.save.mockResolvedValue(updated)

      const result = await service.updateDataSource(1, { isEnabled: false } as never)

      expect(dataSourceRepo.save).toHaveBeenCalled()
      expect(redisService.del).toHaveBeenCalledWith(CACHE_KEYS.PROSPECT_DATA_SOURCES)
      expect(result.isEnabled).toBe(false)
    })

    it('should throw NotFoundException when data source not found', async () => {
      dataSourceRepo.findOne.mockResolvedValue(null)

      await expect(service.updateDataSource(999, { isEnabled: true } as never)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('deleteDataSource', () => {
    it('should delete data source and invalidate cache', async () => {
      const source = dataSourceFixture()
      dataSourceRepo.findOne.mockResolvedValue(source)
      dataSourceRepo.softRemove.mockResolvedValue(source)

      await service.deleteDataSource(1)

      expect(dataSourceRepo.softRemove).toHaveBeenCalledWith(source)
      expect(redisService.del).toHaveBeenCalledWith(CACHE_KEYS.PROSPECT_DATA_SOURCES)
    })

    it('should throw NotFoundException when data source not found', async () => {
      dataSourceRepo.findOne.mockResolvedValue(null)

      await expect(service.deleteDataSource(999)).rejects.toThrow(NotFoundException)
    })
  })

  // ===== Test Connection =====

  describe('testDataSource', () => {
    it('should return success when connection test passes', async () => {
      const source = dataSourceFixture()
      dataSourceRepo.findOne.mockResolvedValue(source)
      tianyanchaAdapter.testConnection.mockResolvedValue(true)

      const result = await service.testDataSource(1)

      expect(result.success).toBe(true)
      expect(result.message).toBe('连接成功')
      expect(tianyanchaAdapter.testConnection).toHaveBeenCalledWith({
        apiKey: source.apiKey,
        apiSecret: source.apiSecret ?? undefined,
        apiEndpoint: source.apiEndpoint ?? undefined,
      })
    })

    it('should return failure message when connection test throws an error', async () => {
      const source = dataSourceFixture()
      dataSourceRepo.findOne.mockResolvedValue(source)
      tianyanchaAdapter.testConnection.mockRejectedValue(new Error('Connection refused'))

      const result = await service.testDataSource(1)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Connection refused')
    })
  })

  // ===== Search Templates =====

  describe('getSearchTemplates', () => {
    it('should return templates for user including shared ones', async () => {
      const userTemplate = templateFixture({ userId: 1, isShared: false })
      const sharedTemplate = templateFixture({ id: 2, userId: 99, isShared: true })
      const templates = [userTemplate, sharedTemplate]
      // Extend the mock with orWhere since the service chains .where().orWhere()
      const qb = Object.assign(createMockQueryBuilder(templates, 2), {
        orWhere: jest.fn().mockReturnThis(),
      })
      redisService.safeGet.mockResolvedValue(null)
      templateRepo.createQueryBuilder.mockReturnValue(qb as unknown)

      const result = await service.getSearchTemplates(1, 'sales')

      expect(result).toHaveLength(2)
      expect(qb.where).toHaveBeenCalledWith('t.userId = :userId', { userId: 1 })
      expect((qb as typeof qb & { orWhere: jest.Mock }).orWhere).toHaveBeenCalledWith(
        't.isShared = :shared',
        { shared: true },
      )
      expect(qb.orderBy).toHaveBeenCalledWith('t.sortOrder', 'ASC')
      expect(redisService.set).toHaveBeenCalled()
    })
  })

  describe('createSearchTemplate', () => {
    it('should create template with userId and invalidate cache', async () => {
      const dto = {
        name: '上海金融企业',
        conditions: { keyword: '金融', province: '上海' },
        isShared: false,
      }
      const created = templateFixture({ ...dto, userId: 5 })

      templateRepo.create.mockReturnValue(created)
      templateRepo.save.mockResolvedValue(created)

      const result = await service.createSearchTemplate(5, dto as never)

      expect(templateRepo.create).toHaveBeenCalledWith({ ...dto, userId: 5 })
      expect(result.userId).toBe(5)
      expect(redisService.delByPattern).toHaveBeenCalledWith(
        `${CACHE_KEYS.PROSPECT_SEARCH_TEMPLATES}:*`,
      )
    })
  })

  describe('updateSearchTemplate', () => {
    it('should update own template and invalidate cache', async () => {
      const template = templateFixture({ userId: 1 })
      const updated = templateFixture({ name: '更新后名称', userId: 1 })

      templateRepo.findOne.mockResolvedValue(template)
      templateRepo.save.mockResolvedValue(updated)

      const result = await service.updateSearchTemplate(1, 1, 'sales', { name: '更新后名称' } as never)

      expect(templateRepo.save).toHaveBeenCalled()
      expect(result.name).toBe('更新后名称')
      expect(redisService.delByPattern).toHaveBeenCalledWith(
        `${CACHE_KEYS.PROSPECT_SEARCH_TEMPLATES}:*`,
      )
    })

    it("should throw BadRequestException when updating another user's template", async () => {
      const template = templateFixture({ userId: 99 })
      templateRepo.findOne.mockResolvedValue(template)

      await expect(
        service.updateSearchTemplate(1, 1, 'sales', { name: '尝试修改' } as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('should allow admin to update any template', async () => {
      const template = templateFixture({ userId: 99 })
      const updated = templateFixture({ name: '管理员修改', userId: 99 })

      templateRepo.findOne.mockResolvedValue(template)
      templateRepo.save.mockResolvedValue(updated)

      const result = await service.updateSearchTemplate(1, 1, 'admin', { name: '管理员修改' } as never)

      expect(templateRepo.save).toHaveBeenCalled()
      expect(result.name).toBe('管理员修改')
    })
  })

  describe('deleteSearchTemplate', () => {
    it('should delete own template and invalidate cache', async () => {
      const template = templateFixture({ userId: 1 })
      templateRepo.findOne.mockResolvedValue(template)
      templateRepo.remove.mockResolvedValue(template)

      await service.deleteSearchTemplate(1, 1, 'sales')

      expect(templateRepo.remove).toHaveBeenCalledWith(template)
      expect(redisService.delByPattern).toHaveBeenCalledWith(
        `${CACHE_KEYS.PROSPECT_SEARCH_TEMPLATES}:*`,
      )
    })

    it('should allow admin to delete any template', async () => {
      const template = templateFixture({ userId: 99 })
      templateRepo.findOne.mockResolvedValue(template)
      templateRepo.remove.mockResolvedValue(template)

      await service.deleteSearchTemplate(1, 1, 'admin')

      expect(templateRepo.remove).toHaveBeenCalledWith(template)
    })
  })

  // ===== Filter Config =====

  describe('getFilterConfig', () => {
    it('should return cached config when cache hit', async () => {
      const config = filterConfigFixture()
      redisService.safeGet.mockResolvedValue(JSON.stringify(config))

      const result = await service.getFilterConfig()

      expect(result.enabledFilters).toEqual(['keyword', 'industry', 'province'])
      expect(filterConfigRepo.findOne).not.toHaveBeenCalled()
    })

    it('should create default config on first access when none exists', async () => {
      const defaultConfig = filterConfigFixture({
        enabledFilters: [
          'keyword', 'industry', 'province', 'city',
          'registeredCapital', 'employeeCount', 'establishDate', 'businessStatus',
        ],
        customFilters: [],
        updatedBy: 0,
      })

      redisService.safeGet.mockResolvedValue(null)
      filterConfigRepo.findOne.mockResolvedValue(null)
      filterConfigRepo.create.mockReturnValue(defaultConfig)
      filterConfigRepo.save.mockResolvedValue(defaultConfig)

      const result = await service.getFilterConfig()

      expect(filterConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          customFilters: [],
          updatedBy: 0,
        }),
      )
      expect(filterConfigRepo.save).toHaveBeenCalledWith(defaultConfig)
      expect(result.enabledFilters).toContain('keyword')
      expect(redisService.set).toHaveBeenCalledWith(
        CACHE_KEYS.PROSPECT_FILTER_CONFIG,
        JSON.stringify(defaultConfig),
        CACHE_TTL.PROSPECT_FILTER_CONFIG,
      )
    })
  })

  describe('updateFilterConfig', () => {
    it('should update config and invalidate cache', async () => {
      const existing = filterConfigFixture()
      const dto = { enabledFilters: ['keyword', 'city'], customFilters: [] }
      const updated = filterConfigFixture({ enabledFilters: ['keyword', 'city'], updatedBy: 3 })

      filterConfigRepo.findOne.mockResolvedValue(existing)
      filterConfigRepo.save.mockResolvedValue(updated)

      const result = await service.updateFilterConfig(dto as never, 3)

      expect(filterConfigRepo.save).toHaveBeenCalled()
      expect(redisService.del).toHaveBeenCalledWith(CACHE_KEYS.PROSPECT_FILTER_CONFIG)
      expect(result.enabledFilters).toEqual(['keyword', 'city'])
    })
  })

  // ===== Configured Adapter =====

  describe('getConfiguredAdapter', () => {
    it('should return adapter with credentials when source is enabled and under quota', async () => {
      const source = dataSourceFixture({
        channel: ProspectChannel.TIANYANCHA,
        isEnabled: true,
        dailyQuota: 100,
        usedToday: 50,
        apiKey: 'live-key',
        apiSecret: 'live-secret',
        apiEndpoint: 'https://custom.api.tianyancha.com',
      })
      dataSourceRepo.findOne.mockResolvedValue(source)

      const result = await service.getConfiguredAdapter(ProspectChannel.TIANYANCHA)

      expect(result).not.toBeNull()
      expect(result!.source).toBe(source)
      expect(result!.credentials).toEqual({
        apiKey: 'live-key',
        apiSecret: 'live-secret',
        apiEndpoint: 'https://custom.api.tianyancha.com',
      })
    })

    it('should return null when daily quota is exceeded', async () => {
      const source = dataSourceFixture({
        channel: ProspectChannel.TIANYANCHA,
        isEnabled: true,
        dailyQuota: 100,
        usedToday: 100, // quota exactly reached
      })
      dataSourceRepo.findOne.mockResolvedValue(source)

      const result = await service.getConfiguredAdapter(ProspectChannel.TIANYANCHA)

      expect(result).toBeNull()
    })
  })
})
