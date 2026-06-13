import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException } from '@nestjs/common'
import { ContractService } from '../../src/modules/contract/contract.service'
import { Contract } from '../../src/modules/contract/entities/contract.entity'
import { ContractTemplateService } from '../../src/modules/contract/contract-template.service'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { ContractStatus, ContractType, UserRole } from '@crm/shared'
import { createMockRepository, createMockQueryBuilder, fixtures } from '../test-utils'
import type { MockRepository } from '../test-utils'
import type { AuthUser } from '../../src/common/decorators/current-user.decorator'

const adminUser: AuthUser = { id: 5, username: 'admin', role: UserRole.ADMIN }

describe('ContractService — Renew', () => {
  let service: ContractService
  let repo: MockRepository<Contract>
  let templateService: { findOne: jest.Mock; renderTemplate: jest.Mock }
  let notificationService: { notify: jest.Mock; notifyUser: jest.Mock }

  beforeEach(async () => {
    repo = createMockRepository<Contract>()
    templateService = { findOne: jest.fn(), renderTemplate: jest.fn() }
    notificationService = { notify: jest.fn(), notifyUser: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: getRepositoryToken(Contract), useValue: repo },
        { provide: ContractTemplateService, useValue: templateService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile()

    service = module.get(ContractService)
  })

  const activeContract = fixtures.contract({
    status: ContractStatus.EXECUTING,
    endDate: '2025-12-31',
  })

  describe('renew', () => {
    it('should create a new contract and mark original as RENEWED', async () => {
      repo.findOne.mockResolvedValue({ ...activeContract })
      // Mock generateContractNo query builder
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.create.mockImplementation((data) => data)
      repo.save.mockImplementation(async (entity) => ({ ...entity, id: 2 }))

      const result = await service.renew(1, '2026-12-31', 200000, adminUser)

      expect(repo.create).toHaveBeenCalled()
      expect(repo.save).toHaveBeenCalledTimes(2) // new contract + update original
      expect(result.parentContractId).toBe(1)
    })

    it('should reject renew for DRAFT contracts', async () => {
      const draftContract = fixtures.contract({ status: ContractStatus.DRAFT })
      repo.findOne.mockResolvedValue(draftContract)

      await expect(service.renew(1, '2026-12-31', 200000, adminUser)).rejects.toThrow(BadRequestException)
    })

    it('should reject renew for CANCELLED contracts', async () => {
      const cancelledContract = fixtures.contract({ status: ContractStatus.CANCELLED })
      repo.findOne.mockResolvedValue(cancelledContract)

      await expect(service.renew(1, '2026-12-31', 200000, adminUser)).rejects.toThrow(BadRequestException)
    })

    it('should allow renew for COMPLETED contracts', async () => {
      const completedContract = fixtures.contract({ status: ContractStatus.COMPLETED })
      repo.findOne.mockResolvedValue({ ...completedContract })
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.create.mockImplementation((data) => data)
      repo.save.mockImplementation(async (entity) => ({ ...entity, id: 2 }))

      const result = await service.renew(1, '2026-12-31', 200000, adminUser)
      expect(result).toBeDefined()
    })

    it('should allow renew for SIGNED contracts', async () => {
      const signedContract = fixtures.contract({ status: ContractStatus.SIGNED })
      repo.findOne.mockResolvedValue({ ...signedContract })
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.create.mockImplementation((data) => data)
      repo.save.mockImplementation(async (entity) => ({ ...entity, id: 2 }))

      const result = await service.renew(1, '2026-12-31', 200000, adminUser)
      expect(result).toBeDefined()
    })
  })

  describe('createFromTemplate', () => {
    it('should create contract from template with rendered content', async () => {
      templateService.findOne.mockResolvedValue({
        id: 1,
        content: 'Hello {{name}}',
      })
      templateService.renderTemplate.mockReturnValue('Hello World')

      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)
      repo.create.mockImplementation((data) => data)
      repo.save.mockImplementation(async (entity) => ({ ...entity, id: 10 }))

      const result = await service.createFromTemplate(
        1,
        { name: 'World' },
        {
          title: 'Test',
          contractType: ContractType.SALES,
          customerId: 1,
          ownerId: 1,
          ourEntity: 'Our',
          customerEntity: 'Them',
          totalAmount: 10000,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        },
        adminUser,
      )

      expect(templateService.findOne).toHaveBeenCalledWith(1)
      expect(result.paymentTerms).toBe('Hello World')
    })
  })

  describe('checkExpiring (cron)', () => {
    it('should send notifications for expiring contracts', async () => {
      const expiringContracts = [
        fixtures.contract({ id: 1, ownerId: 10, title: 'Expiring Soon' }),
      ]
      const qb = createMockQueryBuilder(expiringContracts, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.checkExpiring()

      // Should be called for 30, 7, and 1 day thresholds
      expect(notificationService.notifyUser).toHaveBeenCalled()
    })
  })
})
