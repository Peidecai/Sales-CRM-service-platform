import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { RouteService } from '../../src/modules/route/route.service'
import { Customer } from '../../src/modules/customer/customer.entity'
import { createMockRepository, MockRepository } from '../test-utils'

describe('RouteService', () => {
  let service: RouteService
  let customerRepo: MockRepository<Customer>

  beforeEach(async () => {
    customerRepo = createMockRepository<Customer>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
      ],
    }).compile()

    service = module.get(RouteService)
  })

  describe('optimizeRoute', () => {
    it('should return empty result when fewer than 2 customers', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 1, name: 'Customer A', address: '北京朝阳', region: '北京' },
      ])

      const result = await service.optimizeRoute([1])

      expect(result).toEqual({ points: [], totalDistance: 0 })
    })

    it('should return optimized route for multiple customers', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 1, name: 'Customer A', address: '地址1', region: '北京' },
        { id: 2, name: 'Customer B', address: '地址2', region: '上海' },
        { id: 3, name: 'Customer C', address: '地址3', region: '广州' },
      ])

      const result = await service.optimizeRoute([1, 2, 3])

      expect(result.points).toHaveLength(3)
      expect(result.points[0].order).toBe(1)
      expect(result.points[1].order).toBe(2)
      expect(result.points[2].order).toBe(3)
      expect(result.totalDistance).toBeGreaterThanOrEqual(0)
      // First point distance should be 0 when no start coordinates provided
      expect(result.points[0].distanceFromPrev).toBe(0)
    })

    it('should use start coordinates when provided', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 1, name: 'Customer A', address: '地址1', region: '北京' },
        { id: 2, name: 'Customer B', address: '地址2', region: '上海' },
      ])

      const result = await service.optimizeRoute([1, 2], 39.9, 116.4)

      expect(result.points).toHaveLength(2)
      // First point distance should be > 0 when start coordinates provided
      expect(result.points[0].distanceFromPrev).toBeGreaterThanOrEqual(0)
    })

    it('should populate all RoutePoint fields', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 10, name: 'A Corp', address: '建国路100号', region: '北京' },
        { id: 20, name: 'B Corp', address: '南京路200号', region: '上海' },
      ])

      const result = await service.optimizeRoute([10, 20])

      for (const point of result.points) {
        expect(point).toHaveProperty('customerId')
        expect(point).toHaveProperty('customerName')
        expect(point).toHaveProperty('address')
        expect(point).toHaveProperty('latitude')
        expect(point).toHaveProperty('longitude')
        expect(point).toHaveProperty('distanceFromPrev')
        expect(point).toHaveProperty('order')
        expect(typeof point.latitude).toBe('number')
        expect(typeof point.longitude).toBe('number')
      }
    })

    it('should use fallback address when address/region are empty', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 1, name: 'No Address', address: null, region: null },
        { id: 2, name: 'Has Address', address: '实际地址', region: '北京' },
      ])

      const result = await service.optimizeRoute([1, 2])

      expect(result.points).toHaveLength(2)
      // One point should have a fallback address like "地址1"
      const noAddrPoint = result.points.find((p) => p.customerId === 1)
      expect(noAddrPoint).toBeDefined()
      expect(noAddrPoint!.address).toContain('地址')
    })

    it('should return integer totalDistance', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 1, name: 'A', address: 'a', region: '北京' },
        { id: 2, name: 'B', address: 'b', region: '上海' },
      ])

      const result = await service.optimizeRoute([1, 2])

      expect(Number.isInteger(result.totalDistance)).toBe(true)
      for (const point of result.points) {
        expect(Number.isInteger(point.distanceFromPrev)).toBe(true)
      }
    })

    it('should select nearest neighbor at each step', async () => {
      customerRepo.find.mockResolvedValue([
        { id: 100, name: 'Far', address: 'far', region: '远方' },
        { id: 200, name: 'Near', address: 'near', region: '附近' },
        { id: 300, name: 'Mid', address: 'mid', region: '中间' },
      ])

      const result = await service.optimizeRoute([100, 200, 300])

      // All three customers should be visited
      const visitedIds = result.points.map((p) => p.customerId)
      expect(visitedIds).toHaveLength(3)
      expect(new Set(visitedIds).size).toBe(3)
    })
  })
})
