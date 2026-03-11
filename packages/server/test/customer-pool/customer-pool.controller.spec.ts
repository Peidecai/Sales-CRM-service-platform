import { Test, TestingModule } from '@nestjs/testing'
import { CustomerPoolController } from '../../src/modules/customer-pool/customer-pool.controller'
import { CustomerPoolService } from '../../src/modules/customer-pool/customer-pool.service'
import { CustomerPoolConfigService } from '../../src/modules/customer-pool/customer-pool-config.service'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'
import { fixtures } from '../test-utils'

const mockPoolService = {
  claim: jest.fn(),
  batchClaim: jest.fn(),
  assign: jest.fn(),
  returnToPool: jest.fn(),
  batchReturn: jest.fn(),
  getPoolList: jest.fn(),
  getPoolLogs: jest.fn(),
}

const mockConfigService = {
  getConfig: jest.fn(),
  updateConfig: jest.fn(),
}

describe('CustomerPoolController', () => {
  let controller: CustomerPoolController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerPoolController],
      providers: [
        { provide: CustomerPoolService, useValue: mockPoolService },
        { provide: CustomerPoolConfigService, useValue: mockConfigService },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    })
      .overrideGuard({} as never)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<CustomerPoolController>(CustomerPoolController)
    jest.clearAllMocks()
  })

  /* ---------- getPoolList ---------- */
  describe('getPoolList', () => {
    it('should return paginated pool customers', async () => {
      const customer = { ...fixtures.customer(), isInPool: true }
      mockPoolService.getPoolList.mockResolvedValue({ list: [customer], total: 1 })

      const result = await controller.getPoolList({} as never)

      expect(result.list).toHaveLength(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })
  })

  /* ---------- claim ---------- */
  describe('claim', () => {
    it('should claim customer', async () => {
      const customer = { ...fixtures.customer(), isInPool: false }
      mockPoolService.claim.mockResolvedValue(customer)

      const result = await controller.claim(1, { customerId: 1 } as never)

      expect(mockPoolService.claim).toHaveBeenCalledWith(1, 1)
      expect(result).toBeDefined()
    })
  })

  /* ---------- batchClaim ---------- */
  describe('batchClaim', () => {
    it('should batch claim customers', async () => {
      mockPoolService.batchClaim.mockResolvedValue({ success: [1, 2], failed: [] })

      const result = await controller.batchClaim(1, { customerIds: [1, 2] } as never)

      expect(mockPoolService.batchClaim).toHaveBeenCalledWith(1, [1, 2])
      expect(result.success).toEqual([1, 2])
    })
  })

  /* ---------- assign ---------- */
  describe('assign', () => {
    it('should assign customer to target user', async () => {
      const customer = fixtures.customer()
      mockPoolService.assign.mockResolvedValue(customer)

      const user = { id: 2, username: 'manager', role: 'manager' }
      const result = await controller.assign(user as never, { customerId: 1, toUserId: 5 } as never)

      expect(mockPoolService.assign).toHaveBeenCalledWith(2, 1, 5)
      expect(result).toBeDefined()
    })
  })

  /* ---------- returnToPool ---------- */
  describe('returnToPool', () => {
    it('should return customer to pool', async () => {
      mockPoolService.returnToPool.mockResolvedValue(undefined)

      const result = await controller.returnToPool(1, { customerId: 1, reason: '不再跟进' } as never)

      expect(mockPoolService.returnToPool).toHaveBeenCalledWith(1, 1, '不再跟进')
      expect(result).toBeNull()
    })
  })

  /* ---------- batchReturn ---------- */
  describe('batchReturn', () => {
    it('should batch return customers', async () => {
      mockPoolService.batchReturn.mockResolvedValue({ success: [1], failed: [] })

      const result = await controller.batchReturn(1, { customerIds: [1], reason: '批量退回' } as never)

      expect(mockPoolService.batchReturn).toHaveBeenCalledWith(1, [1], '批量退回')
      expect(result.success).toEqual([1])
    })
  })

  /* ---------- getPoolLogs ---------- */
  describe('getPoolLogs', () => {
    it('should return pool logs', async () => {
      mockPoolService.getPoolLogs.mockResolvedValue({ list: [], total: 0 })

      const result = await controller.getPoolLogs({} as never)

      expect(result.list).toEqual([])
      expect(result.page).toBe(1)
    })
  })

  /* ---------- getConfig ---------- */
  describe('getConfig', () => {
    it('should return pool config', async () => {
      const config = { daily_claim_limit: 5, max_holding: 50 }
      mockConfigService.getConfig.mockResolvedValue(config)

      const result = await controller.getConfig()

      expect(result).toEqual(config)
    })
  })

  /* ---------- updateConfig ---------- */
  describe('updateConfig', () => {
    it('should update pool config', async () => {
      const updated = { daily_claim_limit: 10 }
      mockConfigService.updateConfig.mockResolvedValue(updated)

      const result = await controller.updateConfig({ daily_claim_limit: 10 } as never)

      expect(mockConfigService.updateConfig).toHaveBeenCalledWith({ daily_claim_limit: 10 })
    })
  })
})
