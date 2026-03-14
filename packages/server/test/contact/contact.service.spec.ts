import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ContactService } from '../../src/modules/contact/contact.service'
import { Contact } from '../../src/modules/contact/contact.entity'
import { Customer } from '../../src/modules/customer/customer.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'

const mockContact = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  customerId: 1,
  name: '张三',
  gender: 'male',
  mobile: '13800138000',
  landline: null,
  email: 'zhangsan@example.com',
  wechat: null,
  department: '销售部',
  position: '经理',
  decisionRole: 'decision_maker',
  influenceLevel: 4,
  isPrimary: false,
  birthday: null,
  hobby: null,
  remark: null,
  deleted: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
})

describe('ContactService', () => {
  let service: ContactService
  let contactRepo: MockRepository<Contact>
  let customerRepo: MockRepository<Customer>

  beforeEach(async () => {
    contactRepo = createMockRepository<Contact>()
    customerRepo = createMockRepository<Customer>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
      ],
    }).compile()

    service = module.get<ContactService>(ContactService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- findByCustomer ---------- */
  describe('findByCustomer', () => {
    it('should return paginated contact list', async () => {
      const contacts = [mockContact()]
      const qb = createMockQueryBuilder(contacts, 1)
      contactRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findByCustomer(1, { page: 1, pageSize: 20 } as never)

      expect(qb.where).toHaveBeenCalledWith('contact.customer_id = :customerId', { customerId: 1 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should apply keyword filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      contactRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findByCustomer(1, { keyword: '张' } as never)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(contact.name LIKE :kw OR contact.mobile LIKE :kw)',
        { kw: '%张%' },
      )
    })

    it('should use default page and pageSize', async () => {
      const qb = createMockQueryBuilder([], 0)
      contactRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findByCustomer(1, {} as never)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })
  })

  /* ---------- create ---------- */
  describe('create', () => {
    it('should create contact and return with duplicate warnings', async () => {
      const customer = fixtures.customer()
      customerRepo.findOne.mockResolvedValue(customer)

      const duplicateQb = createMockQueryBuilder([], 0)
      contactRepo.createQueryBuilder.mockReturnValue(duplicateQb)

      const contact = mockContact()
      contactRepo.create.mockReturnValue(contact)
      contactRepo.save.mockResolvedValue(contact)

      const dto = { customerId: 1, name: '张三', mobile: '13800138000' } as never
      const result = await service.create(1, dto)

      expect(customerRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
      expect(contactRepo.save).toHaveBeenCalled()
      expect(result.contact).toBeDefined()
      expect(result.duplicateWarnings).toEqual([])
    })

    it('should throw NotFoundException if customer not found', async () => {
      customerRepo.findOne.mockResolvedValue(null)

      await expect(service.create(999, { name: 'Test' } as never))
        .rejects.toThrow(NotFoundException)
    })

    it('should return duplicate warnings when duplicates found', async () => {
      const customer = fixtures.customer()
      customerRepo.findOne.mockResolvedValue(customer)

      const duplicate = mockContact({ id: 2, name: '李四', mobile: '13800138000', email: 'other@example.com' })
      const duplicateQb = createMockQueryBuilder([duplicate], 1)
      contactRepo.createQueryBuilder.mockReturnValue(duplicateQb)

      const contact = mockContact()
      contactRepo.create.mockReturnValue(contact)
      contactRepo.save.mockResolvedValue(contact)

      const result = await service.create(1, { name: '张三', mobile: '13800138000' } as never)

      expect(result.duplicateWarnings).toHaveLength(1)
      expect(result.duplicateWarnings[0].name).toBe('李四')
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update contact', async () => {
      const contact = mockContact()
      contactRepo.findOne.mockResolvedValue({ ...contact })
      contactRepo.save.mockImplementation(async (r) => r)

      const result = await service.update(1, { name: '李四' } as never)

      expect(result.name).toBe('李四')
    })

    it('should throw NotFoundException if contact not found', async () => {
      contactRepo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { name: 'X' } as never))
        .rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete contact', async () => {
      const contact = mockContact()
      contactRepo.findOne.mockResolvedValue({ ...contact })
      contactRepo.softRemove.mockResolvedValue(contact)

      await service.remove(1)

      expect(contactRepo.softRemove).toHaveBeenCalled()
    })

    it('should throw NotFoundException if contact not found', async () => {
      contactRepo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- checkDuplicate ---------- */
  describe('checkDuplicate', () => {
    it('should return empty array when no mobile or email provided', async () => {
      const result = await service.checkDuplicate()

      expect(result).toEqual([])
    })

    it('should find duplicates by mobile', async () => {
      const duplicate = mockContact({ id: 2, mobile: '13800138000' })
      const qb = createMockQueryBuilder([duplicate], 1)
      contactRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.checkDuplicate('13800138000')

      expect(result).toHaveLength(1)
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('contact.mobile = :mobile'),
        expect.objectContaining({ mobile: '13800138000' }),
      )
    })

    it('should find duplicates by email', async () => {
      const duplicate = mockContact({ id: 2, email: 'test@example.com' })
      const qb = createMockQueryBuilder([duplicate], 1)
      contactRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.checkDuplicate(undefined, 'test@example.com')

      expect(result).toHaveLength(1)
    })

    it('should find duplicates by both mobile and email (OR)', async () => {
      const qb = createMockQueryBuilder([], 0)
      contactRepo.createQueryBuilder.mockReturnValue(qb)

      await service.checkDuplicate('13800138000', 'test@example.com')

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('OR'),
        expect.objectContaining({ mobile: '13800138000', email: 'test@example.com' }),
      )
    })
  })

  /* ---------- setPrimary ---------- */
  describe('setPrimary', () => {
    it('should throw NotFoundException if contact not found', async () => {
      contactRepo.findOne.mockResolvedValue(null)

      await expect(service.setPrimary(999)).rejects.toThrow(NotFoundException)
    })

    it('should set contact as primary within a transaction', async () => {
      const contact = mockContact({ id: 1, customerId: 1, isPrimary: false })
      contactRepo.findOne.mockResolvedValue({ ...contact })

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          update: jest.fn(),
          save: jest.fn().mockImplementation(async (c) => ({ ...c, isPrimary: true })),
        },
      }

      Object.defineProperty(contactRepo, 'manager', {
        value: { connection: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } },
        configurable: true,
      })

      const result = await service.setPrimary(1)

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Contact,
        { customerId: 1 },
        { isPrimary: false },
      )
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
      expect(result.isPrimary).toBe(true)
    })

    it('should rollback transaction on error', async () => {
      const contact = mockContact({ id: 1, customerId: 1 })
      contactRepo.findOne.mockResolvedValue({ ...contact })

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          update: jest.fn().mockRejectedValue(new Error('DB error')),
          save: jest.fn(),
        },
      }

      Object.defineProperty(contactRepo, 'manager', {
        value: { connection: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } },
        configurable: true,
      })

      await expect(service.setPrimary(1)).rejects.toThrow('DB error')

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
      expect(mockQueryRunner.release).toHaveBeenCalled()
    })
  })
})
