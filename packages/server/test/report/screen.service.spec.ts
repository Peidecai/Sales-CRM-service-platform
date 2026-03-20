import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ScreenService } from '../../src/modules/report/screen.service'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { Opportunity } from '../../src/modules/opportunity/opportunity.entity'
import { Contract } from '../../src/modules/contract/entities/contract.entity'
import { Payment } from '../../src/modules/payment/entities/payment.entity'
import { User } from '../../src/modules/user/user.entity'
import { SalesTarget } from '../../src/modules/sales-target/sales-target.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import { RedisService } from '../../src/common/redis/redis.service'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'

describe('ScreenService', () => {
  let service: ScreenService
  let contractRepo: MockRepository
  let callRecordRepo: MockRepository
  let opportunityRepo: MockRepository
  let paymentRepo: MockRepository
  let userRepo: MockRepository
  let salesTargetRepo: MockRepository
  let customerRepo: MockRepository
  let redis: MockRedisService

  beforeEach(async () => {
    contractRepo = createMockRepository()
    callRecordRepo = createMockRepository()
    opportunityRepo = createMockRepository()
    paymentRepo = createMockRepository()
    userRepo = createMockRepository()
    salesTargetRepo = createMockRepository()
    customerRepo = createMockRepository()
    redis = createMockRedisService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenService,
        { provide: getRepositoryToken(CallRecord), useValue: callRecordRepo },
        { provide: getRepositoryToken(Opportunity), useValue: opportunityRepo },
        { provide: getRepositoryToken(Contract), useValue: contractRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(SalesTarget), useValue: salesTargetRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile()

    service = module.get(ScreenService)
  })

  describe('getPerformanceScreen', () => {
    it('should return cached data if available', async () => {
      const cached = { totalRevenue: 1000000, totalContracts: 10 }
      redis.safeGet.mockResolvedValue(JSON.stringify(cached))
      const result = await service.getPerformanceScreen()
      expect(result).toEqual(cached)
    })

    it('should query all panels and cache', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ totalRevenue: 500000, totalContracts: 5 })
      qb.getRawMany.mockResolvedValue([])
      qb.getMany.mockResolvedValue([])
      contractRepo.createQueryBuilder.mockReturnValue(qb)
      salesTargetRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getPerformanceScreen()
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('totalRevenue')
      expect(r).toHaveProperty('trendLine')
      expect(r).toHaveProperty('top10Ranking')
      expect(r).toHaveProperty('recentSignings')
      expect(r).toHaveProperty('targetProgress')
      expect(redis.set).toHaveBeenCalledWith('screen:performance', expect.any(String), 300)
    })
  })

  describe('getCockpitScreen', () => {
    it('should return cached data if available', async () => {
      const cached = { todayCalls: 100, connectRate: 60 }
      redis.safeGet.mockResolvedValue(JSON.stringify(cached))
      const result = await service.getCockpitScreen()
      expect(result).toEqual(cached)
    })

    it('should query all panels and cache', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({ todayCalls: 50, connectRate: 70, avgDuration: 120, count: 100, totalPlanned: 50000, totalCollected: 30000 })
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)
      customerRepo.createQueryBuilder.mockReturnValue(qb)
      opportunityRepo.createQueryBuilder.mockReturnValue(qb)
      contractRepo.createQueryBuilder.mockReturnValue(qb)
      paymentRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getCockpitScreen()
      const r = result as Record<string, unknown>
      expect(r).toHaveProperty('todayCalls')
      expect(r).toHaveProperty('connectRate')
      expect(r).toHaveProperty('funnelData')
      expect(r).toHaveProperty('paymentProgress')
      expect(r).toHaveProperty('teamEfficiency')
      expect(redis.set).toHaveBeenCalledWith('screen:cockpit', expect.any(String), 300)
    })

    it('should handle empty data gracefully', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue(null)
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)
      customerRepo.createQueryBuilder.mockReturnValue(qb)
      opportunityRepo.createQueryBuilder.mockReturnValue(qb)
      contractRepo.createQueryBuilder.mockReturnValue(qb)
      paymentRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getCockpitScreen()
      const r = result as Record<string, unknown>
      expect(r['todayCalls']).toBe(0)
      expect(r['connectRate']).toBe(0)
    })

    it('should use 5min TTL for screen cache', async () => {
      redis.safeGet.mockResolvedValue(null)
      const qb = createMockQueryBuilder()
      qb.getRawOne.mockResolvedValue({})
      qb.getRawMany.mockResolvedValue([])
      callRecordRepo.createQueryBuilder.mockReturnValue(qb)
      customerRepo.createQueryBuilder.mockReturnValue(qb)
      opportunityRepo.createQueryBuilder.mockReturnValue(qb)
      contractRepo.createQueryBuilder.mockReturnValue(qb)
      paymentRepo.createQueryBuilder.mockReturnValue(qb)

      await service.getCockpitScreen()
      expect(redis.set).toHaveBeenCalledWith('screen:cockpit', expect.any(String), 300)
    })
  })
})
