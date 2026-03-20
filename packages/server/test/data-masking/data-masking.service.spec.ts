import { NotFoundException } from '@nestjs/common'
import { DataMaskingService } from '../../src/modules/data-masking/data-masking.service'
import { DataMaskingRule, MaskType } from '../../src/modules/data-masking/entities/data-masking-rule.entity'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
} from '../test-utils'

describe('DataMaskingService', () => {
  let service: DataMaskingService
  let repo: MockRepository<DataMaskingRule>
  let redis: MockRedisService

  const mockRule: Partial<DataMaskingRule> = {
    id: 1,
    name: '客户手机号脱敏',
    entityName: 'customer',
    fieldName: 'phone',
    maskType: MaskType.PARTIAL,
    pattern: '3,4,4',
    exemptRoles: ['admin'],
    exemptPermission: null,
    isActive: true,
  }

  beforeEach(() => {
    repo = createMockRepository<DataMaskingRule>()
    redis = createMockRedisService()
    service = new DataMaskingService(repo as never, redis as never)
  })

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const qb = createMockQueryBuilder([mockRule], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by entityName', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ entityName: 'customer' })
      expect(qb.andWhere).toHaveBeenCalledWith('rule.entityName = :entityName', { entityName: 'customer' })
    })
  })

  describe('create', () => {
    it('should create and clear cache', async () => {
      repo.create.mockReturnValue(mockRule)
      repo.save.mockResolvedValue(mockRule)

      const result = await service.create({
        name: '客户手机号脱敏',
        entityName: 'customer',
        fieldName: 'phone',
        maskType: MaskType.PARTIAL,
        pattern: '3,4,4',
      })

      expect(result).toEqual(mockRule)
      expect(redis.del).toHaveBeenCalledWith('data-masking:rules')
    })
  })

  describe('update', () => {
    it('should update and clear cache', async () => {
      repo.findOne.mockResolvedValue({ ...mockRule })
      repo.save.mockResolvedValue({ ...mockRule, name: 'Updated' })

      const result = await service.update(1, { name: 'Updated' })
      expect(result.name).toBe('Updated')
      expect(redis.del).toHaveBeenCalledWith('data-masking:rules')
    })

    it('should throw if not found', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.update(999, {})).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should soft remove and clear cache', async () => {
      repo.findOne.mockResolvedValue(mockRule)
      repo.softRemove.mockResolvedValue(mockRule)

      await service.remove(1)
      expect(repo.softRemove).toHaveBeenCalled()
      expect(redis.del).toHaveBeenCalledWith('data-masking:rules')
    })

    it('should throw if not found', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('toggleStatus', () => {
    it('should toggle and clear cache', async () => {
      repo.findOne.mockResolvedValue({ ...mockRule })
      repo.save.mockResolvedValue({ ...mockRule, isActive: false })

      const result = await service.toggleStatus(1, false)
      expect(result.isActive).toBe(false)
    })
  })

  describe('getActiveRules', () => {
    it('should return from cache if available', async () => {
      redis.safeGet.mockResolvedValue(JSON.stringify([mockRule]))

      const result = await service.getActiveRules()
      expect(result).toHaveLength(1)
      expect(repo.find).not.toHaveBeenCalled()
    })

    it('should fallback to DB and cache', async () => {
      redis.safeGet.mockResolvedValue(null)
      repo.find.mockResolvedValue([mockRule])

      const result = await service.getActiveRules()
      expect(result).toHaveLength(1)
      expect(redis.set).toHaveBeenCalledWith('data-masking:rules', expect.any(String), 600)
    })
  })

  describe('applyMasking', () => {
    const rules = [mockRule as DataMaskingRule]

    it('should mask phone with partial pattern', () => {
      const data = { phone: '13812345678', name: 'Test' }
      const result = service.applyMasking(data, 'customer', rules, 'sales', [])
      expect(result.phone).toBe('138****5678')
      expect(result.name).toBe('Test')
    })

    it('should skip if role is exempt', () => {
      const data = { phone: '13812345678' }
      const result = service.applyMasking(data, 'customer', rules, 'admin', [])
      expect(result.phone).toBe('13812345678')
    })

    it('should skip if permission is exempt', () => {
      const ruleWithPerm = { ...mockRule, exemptRoles: null, exemptPermission: 'data:view' } as DataMaskingRule
      const data = { phone: '13812345678' }
      const result = service.applyMasking(data, 'customer', [ruleWithPerm], 'sales', ['data:view'])
      expect(result.phone).toBe('13812345678')
    })

    it('should not mask non-matching entity', () => {
      const data = { phone: '13812345678' }
      const result = service.applyMasking(data, 'opportunity', rules, 'sales', [])
      expect(result.phone).toBe('13812345678')
    })

    it('should handle full mask type', () => {
      const fullRule = { ...mockRule, maskType: MaskType.FULL } as DataMaskingRule
      const data = { phone: '13812345678' }
      const result = service.applyMasking(data, 'customer', [fullRule], 'sales', [])
      expect(result.phone).toBe('****')
    })

    it('should handle hash mask type', () => {
      const hashRule = { ...mockRule, maskType: MaskType.HASH } as DataMaskingRule
      const data = { phone: '13812345678' }
      const result = service.applyMasking(data, 'customer', [hashRule], 'sales', [])
      expect(typeof result.phone).toBe('string')
      expect((result.phone as string).length).toBe(8)
    })
  })

  describe('preview', () => {
    it('should preview partial mask', () => {
      expect(service.preview('13812345678', MaskType.PARTIAL, '3,4,4')).toBe('138****5678')
    })

    it('should preview full mask', () => {
      expect(service.preview('secret', MaskType.FULL, null)).toBe('****')
    })
  })
})
