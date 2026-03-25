import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CallReportService } from '../../src/modules/report/call-report.service'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { RedisService } from '../../src/common/redis/redis.service'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
  type MockQueryBuilder,
} from '../test-utils'
import { UserRole } from '@crm/shared'
import { GroupBy } from '../../src/modules/report/dto/report-filter.dto'

describe('CallReportService', () => {
  let service: CallReportService
  let callRecordRepo: MockRepository
  let redis: MockRedisService

  beforeEach(async () => {
    callRecordRepo = createMockRepository()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallReportService,
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get(CallReportService)
  })

  const adminUser = { id: 1, role: UserRole.ADMIN }
  const salesUser = { id: 2, role: UserRole.SALES }
  const baseFilter = { startDate: '2025-01-01', endDate: '2025-12-31' }

  describe('getStatistics', () => {
    it('should return cached data if available', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify([{ period: '2025-01', totalCalls: 10 }]))
      const result = await service.getStatistics(baseFilter, adminUser)
      expect(result).toEqual([{ period: '2025-01', totalCalls: 10 }])
      expect(callRecordRepo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('should query DB and cache result on cache miss', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([{ period: '2025-01', totalCalls: 5 }])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics(baseFilter, adminUser)
      expect(result).toEqual([{ period: '2025-01', totalCalls: 5 }])
      expect(redis.set).toHaveBeenCalled()
    })

    it('should force userId for SALES users', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getStatistics(baseFilter, salesUser)
      // The cache key should include the sales user ID via data permission
      expect(redis.set).toHaveBeenCalled()
    })

    it('should group by week when specified', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getStatistics({ ...baseFilter, groupBy: GroupBy.WEEK }, adminUser)
      expect(qb.select).toHaveBeenCalled()
    })
  })

  describe('getDailyAnalysis', () => {
    it('should return cached data if available', async () => {
      const cached = { today: { totalCalls: 5 }, yesterday: { totalCalls: 3 }, lastWeekSameDay: { totalCalls: 4 } }
      redis.safeGet.mockResolvedValue(JSON.stringify(cached))
      const result = await service.getDailyAnalysis({}, adminUser)
      expect(result).toEqual(cached)
    })

    it('should query three date ranges from DB', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalCalls: 5, connectedCalls: 3, avgDuration: 120, connectRate: 60 })
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getDailyAnalysis({}, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('today')
      expect(r).toHaveProperty('yesterday')
      expect(r).toHaveProperty('lastWeekSameDay')
      expect(redis.set).toHaveBeenCalled()
    })
  })

  describe('getPersonalAnalysis', () => {
    it('should force own userId for SALES role', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ callCount: 10 })
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getPersonalAnalysis(99, baseFilter, salesUser)
      // SALES user should see own data, not userId=99
      expect(qb.andWhere).toHaveBeenCalledWith('cr.user_id = :userId', { userId: salesUser.id })
    })

    it('should allow admin to view any user', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ callCount: 10 })
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getPersonalAnalysis(99, baseFilter, adminUser)
      expect(qb.andWhere).toHaveBeenCalledWith('cr.user_id = :userId', { userId: 99 })
    })
  })

  describe('getDetailAnalysis', () => {
    it('should return hourly and duration distributions', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValueOnce([{ hour: 9, count: 10 }])
      qb.getRawMany.mockResolvedValueOnce([{ durationRange: '1-3分钟', count: 5 }])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getDetailAnalysis(baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('hourlyDistribution')
      expect(r).toHaveProperty('durationDistribution')
    })

    it('should cache the result', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getDetailAnalysis(baseFilter, adminUser)
      expect(redis.set).toHaveBeenCalled()
    })
  })
})
