import { Test, TestingModule } from '@nestjs/testing'
import { ContactController } from '../../src/modules/contact/contact.controller'
import { ContactService } from '../../src/modules/contact/contact.service'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'

const mockContactService = {
  findByCustomer: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  checkDuplicate: jest.fn(),
  setPrimary: jest.fn(),
}

const mockContact = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  customerId: 1,
  name: '张三',
  mobile: '13800138000',
  email: 'test@example.com',
  isPrimary: false,
  deleted: false,
  ...overrides,
})

describe('ContactController', () => {
  let controller: ContactController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        { provide: ContactService, useValue: mockContactService },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    })
      .overrideGuard(/* JwtAuthGuard */ {} as never)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ContactController>(ContactController)
    jest.clearAllMocks()
  })

  /* ---------- findByCustomer ---------- */
  describe('findByCustomer', () => {
    it('should return paginated contact list', async () => {
      const contacts = [mockContact()]
      mockContactService.findByCustomer.mockResolvedValue({ list: contacts, total: 1 })

      const result = await controller.findByCustomer(1, {} as never)

      expect(mockContactService.findByCustomer).toHaveBeenCalledWith(1, expect.any(Object))
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })
  })

  /* ---------- create ---------- */
  describe('create', () => {
    it('should create contact for customer', async () => {
      const contact = mockContact()
      mockContactService.create.mockResolvedValue({ contact, duplicateWarnings: [] })

      const dto = { name: '张三', mobile: '13800138000' } as never
      const result = await controller.create(1, dto)

      expect(mockContactService.create).toHaveBeenCalledWith(1, expect.objectContaining({ customerId: 1 }))
      expect(result.contact).toBeDefined()
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update contact', async () => {
      const updated = mockContact({ name: '李四' })
      mockContactService.update.mockResolvedValue(updated)

      const result = await controller.update(1, { name: '李四' } as never)

      expect(mockContactService.update).toHaveBeenCalledWith(1, { name: '李四' })
      expect(result.name).toBe('李四')
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete contact', async () => {
      mockContactService.remove.mockResolvedValue(undefined)

      const result = await controller.remove(1)

      expect(mockContactService.remove).toHaveBeenCalledWith(1)
      expect(result).toBeNull()
    })
  })

  /* ---------- checkDuplicate ---------- */
  describe('checkDuplicate', () => {
    it('should return duplicate contacts', async () => {
      const duplicates = [mockContact({ id: 2 })]
      mockContactService.checkDuplicate.mockResolvedValue(duplicates)

      const result = await controller.checkDuplicate({ mobile: '13800138000' })

      expect(mockContactService.checkDuplicate).toHaveBeenCalledWith('13800138000', undefined)
      expect(result).toHaveLength(1)
    })
  })

  /* ---------- setPrimary ---------- */
  describe('setPrimary', () => {
    it('should set contact as primary', async () => {
      const contact = mockContact({ isPrimary: true })
      mockContactService.setPrimary.mockResolvedValue(contact)

      const result = await controller.setPrimary(1)

      expect(mockContactService.setPrimary).toHaveBeenCalledWith(1)
      expect(result.isPrimary).toBe(true)
    })
  })
})
