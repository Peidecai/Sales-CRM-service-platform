import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AiReportService } from '../../src/modules/report/ai-report.service'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { User } from '../../src/modules/user/user.entity'
import { RedisService } from '../../src/common/redis/redis.service'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'
import { UserRole } from '@crm/shared'

describe('AiReportService', () => {
  let service: AiReportService
  let callRecordRepo: MockRepository
  let userRepo: MockRepository
  let redis: MockRedisService

  beforeEach(async () => {
    callRecordRepo = createMockRepository()
    userRepo = createMockRepository()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReportService,
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get(AiReportService)
  })

  const adminUser = { id: 1, role: UserRole.ADMIN }
  const salesUser = { id: 2, role: UserRole.SALES }
  const baseFilter = { startDate: '2025-01-01', endDate: '2025-12-31' }

  describe('getSpeechSkillAnalysis', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify([{ userId: 1 }]))
      const result = await service.getSpeechSkillAnalysis(baseFilter, adminUser)
      expect(result).toEqual([{ userId: 1 }])
    })

    it('should query DB and generate radar data', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([{ userId: 1, userName: 'Test', totalCalls: 10, avgDuration: 200 }])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getSpeechSkillAnalysis(baseFilter, adminUser)
      expect(Array.isArray(result)).toBe(true)
      const arr = result as Array<Record<string, unknown>>
      expect(arr[0]).toHaveProperty('dimensions')
    })

    it('should apply date filters', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getSpeechSkillAnalysis(baseFilter, adminUser)
      expect(qb.andWhere).toHaveBeenCalledWith('cr.call_at >= :startDate', { startDate: '2025-01-01' })
    })
  })

  describe('getScoreRanking', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify({ ranking: [], distribution: [] }))
      const result = await service.getScoreRanking(baseFilter, adminUser)
      expect(result).toHaveProperty('ranking')
    })

    it('should query ranking and distribution', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValueOnce([{ userId: 1, userName: 'Test', score: 85 }])
      qb.getRawMany.mockResolvedValueOnce([{ range: '300+', count: 5 }])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getScoreRanking(baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('ranking')
      expect(r).toHaveProperty('distribution')
    })
  })

  describe('getEmployeePortrait', () => {
    it('should force own userId for SALES', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalCalls: 10 })
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)
      userRepo.findOne.mockResolvedValue({ id: 2, name: 'SalesUser' })

      await service.getEmployeePortrait(99, baseFilter, salesUser)
      expect(qb.andWhere).toHaveBeenCalledWith('cr.user_id = :userId', { userId: salesUser.id })
    })

    it('should return metrics and growth curve', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalCalls: 50, connectedCalls: 30, avgDuration: 180 })
      qb.getRawMany.mockResolvedValue([{ period: '2025-01', callCount: 10, connectRate: 60 }])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)
      userRepo.findOne.mockResolvedValue({ id: 1, name: 'Admin' })

      const result = await service.getEmployeePortrait(1, baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('metrics')
      expect(r).toHaveProperty('growthCurve')
      expect(r['userName']).toBe('Admin')
    })

    it('should cache the result', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({})
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)
      userRepo.findOne.mockResolvedValue({ id: 1, name: 'Admin' })

      await service.getEmployeePortrait(1, baseFilter, adminUser)
      expect(redis.set).toHaveBeenCalled()
    })
  })

  describe('getTagStatistics', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify([{ callResult: 'connected', count: 10 }]))
      const result = await service.getTagStatistics(baseFilter, adminUser)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should query tag distribution', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([{ callResult: 'connected', count: 10 }])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getTagStatistics(baseFilter, adminUser)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
