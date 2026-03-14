import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ContractService } from '../../src/modules/contract/contract.service'
import { Contract } from '../../src/modules/contract/entities/contract.entity'
import { ContractStatus, ContractType } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'

describe('ContractService', () => {
  let service: ContractService
  let repo: MockRepository<Contract>

  beforeEach(async () => {
    repo = createMockRepository<Contract>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: getRepositoryToken(Contract), useValue: repo },
      ],
    }).compile()

    service = module.get<ContractService>(ContractService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      title: 'New Contract',
      customerId: 1,
      ownerId: 1,
      ourEntity: 'Our Corp',
      customerEntity: 'Client Corp',
      totalAmount: 50000,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }

    it('should create a contract with generated contractNo', async () => {
      // generateContractNo query — no existing contract today
      const qb = createMockQueryBuilder([])
      repo.createQueryBuilder.mockReturnValue(qb)

      const contract = fixtures.contract({ ...dto })
      repo.create.mockReturnValue(contract)
      repo.save.mockResolvedValue(contract)

      const result = await service.create(dto as never, 2)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('c')
      expect(qb.getOne).toHaveBeenCalled()
      expect(repo.create).toHaveBeenCalled()
      const createArg = repo.create.mock.calls[0][0]
      expect(createArg.contractNo).toMatch(/^CON-\d{8}-0001$/)
      expect(createArg.createdBy).toBe(2)
      expect(createArg.currency).toBe('CNY')
      expect(createArg.paidAmount).toBe(0)
      expect(repo.save).toHaveBeenCalledWith(contract)
      expect(result).toEqual(contract)
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return paginated results with filters', async () => {
      const contracts = [fixtures.contract(), fixtures.contract({ id: 2 })]
      const qb = createMockQueryBuilder(contracts, 2)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({
        page: 1,
        pageSize: 20,
        status: ContractStatus.DRAFT,
        customerId: 1,
      } as never)

      expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', { status: ContractStatus.DRAFT })
      expect(qb.andWhere).toHaveBeenCalledWith('c.customer_id = :customerId', { customerId: 1 })
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result).toEqual({ list: contracts, total: 2, page: 1, pageSize: 20 })
    })

    it('should filter by keyword', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 10, keyword: 'test' } as never)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.contract_no LIKE :kw OR c.title LIKE :kw)',
        { kw: '%test%' },
      )
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return a contract by id', async () => {
      const contract = fixtures.contract()
      repo.findOne.mockResolvedValue(contract)

      const result = await service.findOne(1)

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
      expect(result).toEqual(contract)
    })

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update and return the contract', async () => {
      const existing = fixtures.contract()
      const updated = { ...existing, title: 'Updated Title' }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockResolvedValue(updated)

      const result = await service.update(1, { title: 'Updated Title' } as never)

      expect(repo.save).toHaveBeenCalled()
      expect(result.title).toBe('Updated Title')
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-remove the contract', async () => {
      const contract = fixtures.contract()
      repo.findOne.mockResolvedValue(contract)
      repo.softRemove.mockResolvedValue(contract)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(contract)
    })
  })

  /* ---------- confirmSign ---------- */
  describe('confirmSign', () => {
    it('should set status to SIGNED with signDate and signFileUrl', async () => {
      const contract = fixtures.contract()
      repo.findOne.mockResolvedValue(contract)
      repo.save.mockImplementation(async (c) => c)

      const result = await service.confirmSign(1, 'https://oss.example.com/signed.pdf')

      expect(result.status).toBe(ContractStatus.SIGNED)
      expect(result.signDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.signFileUrl).toBe('https://oss.example.com/signed.pdf')
    })

    it('should set SIGNED status without signFileUrl when not provided', async () => {
      const contract = fixtures.contract()
      repo.findOne.mockResolvedValue(contract)
      repo.save.mockImplementation(async (c) => c)

      const result = await service.confirmSign(1)

      expect(result.status).toBe(ContractStatus.SIGNED)
      expect(result.signFileUrl).toBeNull()
    })
  })

  /* ---------- getExpiringContracts ---------- */
  describe('getExpiringContracts', () => {
    it('should return active contracts expiring within given days', async () => {
      const expiringContracts = [
        fixtures.contract({ status: ContractStatus.SIGNED, endDate: '2025-02-01' }),
      ]
      const qb = createMockQueryBuilder(expiringContracts)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getExpiringContracts(30)

      expect(qb.andWhere).toHaveBeenCalledWith('c.status IN (:...activeStatuses)', {
        activeStatuses: [ContractStatus.SIGNED, ContractStatus.EXECUTING],
      })
      expect(qb.andWhere).toHaveBeenCalledWith('c.end_date <= :futureDate', expect.any(Object))
      expect(qb.getMany).toHaveBeenCalled()
      expect(result).toEqual(expiringContracts)
    })
  })
})
