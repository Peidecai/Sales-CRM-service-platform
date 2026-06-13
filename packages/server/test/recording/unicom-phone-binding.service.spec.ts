import { UserRole } from '@crm/shared'
import { UnicomPhoneBindingService } from '../../src/modules/recording/unicom-phone-binding.service'
import { UnicomPhoneBinding } from '../../src/modules/recording/entities/unicom-phone-binding.entity'
import { User } from '../../src/modules/user/user.entity'
import {
  createMockConfigService,
  createMockRepository,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('UnicomPhoneBindingService', () => {
  let service: UnicomPhoneBindingService
  let bindingRepo: MockRepository<UnicomPhoneBinding>
  let userRepo: MockRepository<User>

  beforeEach(() => {
    bindingRepo = createMockRepository<UnicomPhoneBinding>()
    userRepo = createMockRepository<User>()

    bindingRepo.find.mockResolvedValue([])
    bindingRepo.findOne.mockResolvedValue(null)
    bindingRepo.create.mockImplementation((payload) => ({ id: 20, ...payload }))
    bindingRepo.save.mockImplementation(async (record) => ({
      id: record.id ?? 20,
      createdAt: new Date('2026-05-06T00:00:00Z'),
      updatedAt: new Date('2026-05-06T00:00:00Z'),
      ...record,
    }))
    bindingRepo.remove.mockResolvedValue(undefined)

    userRepo.findOne.mockResolvedValue(
      fixtures.user({ id: 7, role: UserRole.SALES, phone: '13900139000' }) as User,
    )

    service = new UnicomPhoneBindingService(
      createMockConfigService({
        PUBLIC_CALLBACK_BASE_URL: 'https://crm.example.com/',
      }) as never,
      bindingRepo as never,
      userRepo as never,
    )
  })

  it('should create a phone binding and generate callback URLs', async () => {
    const result = await service.create({
      phone: '+86 13800138000',
      userId: 7,
      remark: '联通云呼',
    })

    expect(bindingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '13800138000',
        userId: 7,
        isEnabled: true,
        remark: '联通云呼',
      }),
    )
    expect(result).toEqual(
      expect.objectContaining({
        phone: '13800138000',
        userId: 7,
        userName: 'Test User',
        recordCallbackUrl: 'https://crm.example.com/api/v1/unicom/records',
        transcriptionCallbackUrl: 'https://crm.example.com/api/v1/unicom/transcriptions',
      }),
    )
  })

  it('should respect a custom API prefix when generating callback URLs', () => {
    const prefixedService = new UnicomPhoneBindingService(
      createMockConfigService({
        PUBLIC_CALLBACK_BASE_URL: 'https://crm.example.com/',
        API_PREFIX: '/crm-api',
      }) as never,
      bindingRepo as never,
      userRepo as never,
    )

    expect(prefixedService.buildRecordCallbackUrl('13800138000')).toBe(
      'https://crm.example.com/crm-api/unicom/records',
    )
    expect(prefixedService.buildTranscriptionCallbackUrl('13800138000')).toBe(
      'https://crm.example.com/crm-api/unicom/transcriptions',
    )
  })

  it('should preserve the configured public callback port when generating URLs', () => {
    const publicPortService = new UnicomPhoneBindingService(
      createMockConfigService({
        PUBLIC_CALLBACK_BASE_URL: 'https://callback.example.com',
      }) as never,
      bindingRepo as never,
      userRepo as never,
    )

    expect(publicPortService.buildRecordCallbackUrl('13426376401')).toBe(
      'https://callback.example.com/api/v1/unicom/records',
    )
    expect(publicPortService.buildTranscriptionCallbackUrl('13426376401')).toBe(
      'https://callback.example.com/api/v1/unicom/transcriptions',
    )
  })

  it('should reject duplicate phone bindings', async () => {
    bindingRepo.findOne.mockResolvedValueOnce({
      id: 21,
      phone: '13800138000',
    } as UnicomPhoneBinding)

    await expect(
      service.create({
        phone: '13800138000',
        userId: 7,
      }),
    ).rejects.toThrow('已绑定销售员')
  })

  it('should reject inactive users', async () => {
    userRepo.findOne.mockResolvedValueOnce(
      fixtures.user({ id: 9, role: UserRole.SALES, isActive: false }) as User,
    )

    await expect(
      service.create({
        phone: '13800138000',
        userId: 9,
      }),
    ).rejects.toThrow('不存在或未启用')
  })
})
