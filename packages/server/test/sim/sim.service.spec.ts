import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { SimService } from '../../src/modules/sim/sim.service'
import { SimPreference } from '../../src/modules/sim/entities/sim-preference.entity'
import { CustomerSimBinding } from '../../src/modules/sim/entities/customer-sim-binding.entity'
import { CallRecord } from '../../src/modules/call-record/call-record.entity'
import { UserRole } from '@crm/shared'

describe('SimService', () => {
  let service: SimService
  let prefRepo: Record<string, jest.Mock>
  let bindingRepo: Record<string, jest.Mock>
  let crRepo: Record<string, jest.Mock>
  const user = { id: 1, role: UserRole.SALES, name: 'Sales' } as any

  beforeEach(async () => {
    prefRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => ({ id: 1, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 1, ...e })),
    }
    bindingRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => ({ id: 1, ...d })),
      save: jest.fn((e) => Promise.resolve({ id: 1, ...e })),
      softRemove: jest.fn().mockResolvedValue({}),
    }
    crRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ simSlot: 0, callCount: 5, totalDuration: 300 }]),
      })),
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimService,
        { provide: getRepositoryToken(SimPreference), useValue: prefRepo },
        { provide: getRepositoryToken(CustomerSimBinding), useValue: bindingRepo },
        { provide: getRepositoryToken(CallRecord), useValue: crRepo },
      ],
    }).compile()
    service = module.get(SimService)
  })

  it('should get preference', async () => {
    prefRepo.findOne.mockResolvedValue({ userId: 1, defaultSlot: 0 })
    const result = await service.getPreference(1)
    expect(result?.defaultSlot).toBe(0)
  })

  it('should create preference if not exists', async () => {
    prefRepo.findOne.mockResolvedValue(null)
    await service.updatePreference(1, { defaultSlot: 1 })
    expect(prefRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, defaultSlot: 1 }))
  })

  it('should update existing preference', async () => {
    prefRepo.findOne.mockResolvedValue({ userId: 1, defaultSlot: 0 })
    await service.updatePreference(1, { defaultSlot: 1, sim1Number: '138' })
    expect(prefRepo.save).toHaveBeenCalledWith(expect.objectContaining({ defaultSlot: 1, sim1Number: '138' }))
  })

  it('should get customer binding', async () => {
    bindingRepo.findOne.mockResolvedValue({ userId: 1, customerId: 10, simSlot: 1 })
    const result = await service.getCustomerBinding(1, 10)
    expect(result?.simSlot).toBe(1)
  })

  it('should create customer binding', async () => {
    bindingRepo.findOne.mockResolvedValue(null)
    await service.setCustomerBinding(1, { customerId: 10, simSlot: 1 })
    expect(bindingRepo.create).toHaveBeenCalledWith(expect.objectContaining({ customerId: 10, simSlot: 1 }))
  })

  it('should update existing customer binding', async () => {
    bindingRepo.findOne.mockResolvedValue({ userId: 1, customerId: 10, simSlot: 0 })
    await service.setCustomerBinding(1, { customerId: 10, simSlot: 1 })
    expect(bindingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ simSlot: 1 }))
  })

  it('should remove customer binding', async () => {
    bindingRepo.findOne.mockResolvedValue({ id: 1 })
    await service.removeCustomerBinding(1, 10)
    expect(bindingRepo.softRemove).toHaveBeenCalled()
  })

  it('should throw on removing non-existent binding', async () => {
    bindingRepo.findOne.mockResolvedValue(null)
    await expect(service.removeCustomerBinding(1, 999)).rejects.toThrow(NotFoundException)
  })

  it('should resolve via customer binding first', async () => {
    bindingRepo.findOne.mockResolvedValue({ simSlot: 1 })
    const result = await service.resolveSimSlot(1, 10)
    expect(result).toEqual({ slot: 1, source: 'customer_binding' })
  })

  it('should resolve via default preference', async () => {
    bindingRepo.findOne.mockResolvedValue(null)
    prefRepo.findOne.mockResolvedValue({ defaultSlot: 1 })
    const result = await service.resolveSimSlot(1, 10)
    expect(result).toEqual({ slot: 1, source: 'default' })
  })

  it('should fallback to SIM1', async () => {
    bindingRepo.findOne.mockResolvedValue(null)
    prefRepo.findOne.mockResolvedValue(null)
    const result = await service.resolveSimSlot(1)
    expect(result).toEqual({ slot: 0, source: 'fallback' })
  })

  it('should return usage statistics', async () => {
    const result = await service.getUsageStatistics(1, {})
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ simSlot: 0, callCount: 5, totalDuration: 300 })
  })
})