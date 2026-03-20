import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PerformanceReportService } from '../../src/modules/report/performance-report.service'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { Contract } from '../../src/modules/contract/entities/contract.entity'
import { Payment } from '../../src/modules/payment/entities/payment.entity'
import { User } from '../../src/modules/user/user.entity'
import { SalesTarget } from '../../src/modules/sales-target/sales-target.entity'
import { RedisService } from '../../src/common/redis/redis.service'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'
import { UserRole } from '@crm/shared'

describe('PerformanceReportService', () => {
  let service: PerformanceReportService
  let contractRepo: MockRepository
  let paymentRepo: MockRepository
  let opportunityRepo: MockRepository
  let salesTargetRepo: MockRepository
  let userRepo: MockRepository
  let redis: MockRedisService

  beforeEach(async () => {
    contractRepo = createMockRepository()
    paymentRepo = createMockRepository()
    opportunityRepo = createMockRepository()
    salesTargetRepo = createMockRepository()
    userRepo = createMockRepository()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceReportService,
        { provide: getRepositoryToken(Opportunity), useValue: opportunityRepo },
        { provide: getRepositoryToken(Contract), useValue: contractRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(SalesTarget), useValue: salesTargetRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get(PerformanceReportService)
  })

  const adminUser = { id: 1, role: UserRole.ADMIN }
  const salesUser = { id: 2, role: UserRole.SALES }
  const baseFilter = { startDate: '2025-01-01', endDate: '2025-12-31' }

  describe('getSummary', () => {
    it('should return cached data if available', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify([{ userName: 'Test', contractCount: 5 }]))
      const result = await service.getSummary(baseFilter, adminUser)
      expect(result).toEqual([{ userName: 'Test', contractCount: 5 }])
    })

    it('should query DB on cache miss', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([{ userId: 1, userName: 'Test', contractCount: 2, contractAmount: 100000 }])
      contractRepo.createQueryBuilder.mockReturnValue(qb)

      const payQb = createMockQueryBuilder()
      payQb.getRawOne.mockResolvedValue({ paymentAmount: 50000 })
      paymentRepo.createQueryBuilder.mockReturnValue(payQb)

      const targetQb = createMockQueryBuilder()
      targetQb.getRawOne.mockResolvedValue({ targetAmount: 200000 })
      salesTargetRepo.createQueryBuilder.mockReturnValue(targetQb)

      const result = await service.getSummary(baseFilter, adminUser)
      expect(Array.isArray(result)).toBe(true)
      expect(redis.set).toHaveBeenCalled()
    })

    it('should force userId for SALES', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      contractRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getSummary(baseFilter, salesUser)
      expect(qb.andWhere).toHaveBeenCalledWith('c.owner_id = :userId', { userId: salesUser.id })
    })
  })

  describe('getSigningStats', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify({ trends: [], topSigners: [] }))
      const result = await service.getSigningStats(baseFilter, adminUser)
      expect(result).toHaveProperty('trends')
    })

    it('should query DB and return trends, topSigners, conversionRate', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      qb.getRawOne.mockResolvedValue({ total: 100, converted: 20 })
      contractRepo.createQueryBuilder.mockReturnValue(qb)
      opportunityRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getSigningStats(baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('trends')
      expect(r).toHaveProperty('topSigners')
      expect(r).toHaveProperty('conversionRate')
    })
  })

  describe('getCollectionStats', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify({ trends: [], collectionRate: 80 }))
      const result = await service.getCollectionStats(baseFilter, adminUser)
      expect(result).toHaveProperty('collectionRate')
    })

    it('should compute collection and overdue rates', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      qb.getRawOne.mockResolvedValue({ totalPlanned: 10, overdueCount: 2, collectedCount: 8 })
      paymentRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getCollectionStats(baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('collectionRate')
      expect(r).toHaveProperty('overdueRate')
      expect(r).toHaveProperty('perUser')
    })
  })

  describe('getOverview', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify({ totalRevenue: 1000000 }))
      const result = await service.getOverview(baseFilter, adminUser)
      expect(result).toHaveProperty('totalRevenue')
    })

    it('should compute revenue, contracts, avgDealSize', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalContracts: 10, totalRevenue: 500000 })
      contractRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getOverview(baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('totalRevenue')
      expect(r).toHaveProperty('totalContracts')
      expect(r).toHaveProperty('avgDealSize')
      expect(r['avgDealSize']).toBe(50000)
    })

    it('should handle zero contracts gracefully', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalContracts: 0, totalRevenue: 0 })
      contractRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getOverview(baseFilter, adminUser)
      const r = result as Record<string, unknown>
      expect(r['avgDealSize']).toBe(0)
    })
  })

  describe('getTargetCompletion', () => {
    it('should return cached data', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify([{ name: 'Q1 Target' }]))
      const result = await service.getTargetCompletion(baseFilter, adminUser)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should query targets with completion rate', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([{ targetId: 1, name: 'Q1', completionRate: 75 }])
      salesTargetRepo.createQueryBuilder.mockReturnValue(qb)
      userRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getTargetCompletion(baseFilter, adminUser)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
