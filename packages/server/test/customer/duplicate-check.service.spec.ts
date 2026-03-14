import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import {
  DuplicateCheckService,
  DuplicateResult,
} from '../../src/modules/customer/services/duplicate-check.service'
import { Customer } from '../../src/modules/customer/customer.entity'
import { Contact } from '../../src/modules/contact/contact.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
} from '../test-utils'
import type { CheckDuplicateDto } from '../../src/modules/customer/dto/check-duplicate.dto'

describe('DuplicateCheckService', () => {
  let service: DuplicateCheckService
  let customerRepo: MockRepository<Customer>
  let contactRepo: MockRepository<Contact>

  beforeEach(async () => {
    customerRepo = createMockRepository<Customer>()
    contactRepo = createMockRepository<Contact>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateCheckService,
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
      ],
    }).compile()

    service = module.get<DuplicateCheckService>(DuplicateCheckService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- No input fields ---------- */

  it('should return empty array when no input fields provided', async () => {
    const input: CheckDuplicateDto = {}
    const results = await service.checkDuplicates(input)
    expect(results).toEqual([])
    expect(customerRepo.find).not.toHaveBeenCalled()
  })

  /* ---------- Dimension 1: Unified credit code ---------- */

  describe('unified credit code (100%)', () => {
    it('should return exact match with 100% confidence', async () => {
      const customer = fixtures.customer({ id: 10, name: 'Company A' })
      customerRepo.find.mockResolvedValue([customer])

      const results = await service.checkDuplicates({
        unifiedCreditCode: '91110000MA01ABCD1X',
      })

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('unified_credit_code')
      expect(results[0].confidence).toBe(100)
      expect(results[0].customer.id).toBe(10)
    })

    it('should return empty when no credit code match', async () => {
      customerRepo.find.mockResolvedValue([])

      const results = await service.checkDuplicates({
        unifiedCreditCode: 'NO_MATCH',
      })

      expect(results).toEqual([])
    })
  })

  /* ---------- Dimension 2: Phone ---------- */

  describe('phone (95%)', () => {
    it('should return phone match with 95% confidence', async () => {
      const customer = fixtures.customer({ id: 20, phone: '13800138000' })
      customerRepo.find.mockResolvedValue([customer])

      const results = await service.checkDuplicates({
        phone: '13800138000',
      })

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('phone')
      expect(results[0].confidence).toBe(95)
    })
  })

  /* ---------- Dimension 3: Email ---------- */

  describe('email (90%)', () => {
    it('should return email match with 90% confidence', async () => {
      const customer = fixtures.customer({
        id: 30,
        email: 'dup@example.com',
      })
      customerRepo.find.mockResolvedValue([customer])

      const results = await service.checkDuplicates({
        email: 'dup@example.com',
      })

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('email')
      expect(results[0].confidence).toBe(90)
    })
  })

  /* ---------- Dimension 4: Company fuzzy (SOUNDEX + Levenshtein) ---------- */

  describe('company fuzzy match', () => {
    it('should match similar company names above 80% threshold', async () => {
      const candidate = fixtures.customer({
        id: 40,
        company: 'Acme Corporation',
      })
      const qb = createMockQueryBuilder([candidate], 1)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      const results = await service.checkDuplicates({
        company: 'Acme Corporation', // exact = 100% similarity
      })

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('company_fuzzy')
      expect(results[0].confidence).toBe(100)
      expect(qb.andWhere).toHaveBeenCalledWith(
        'SOUNDEX(c.company) = SOUNDEX(:company)',
        { company: 'Acme Corporation' },
      )
    })

    it('should reject company names below 80% similarity', async () => {
      const candidate = fixtures.customer({
        id: 41,
        company: 'Totally Different Inc',
      })
      const qb = createMockQueryBuilder([candidate], 1)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      const results = await service.checkDuplicates({
        company: 'XYZ',
      })

      // Levenshtein similarity of 'xyz' vs 'totally different inc' should be < 0.8
      expect(results).toEqual([])
    })

    it('should handle null company in candidate', async () => {
      const candidate = fixtures.customer({ id: 42, company: null })
      const qb = createMockQueryBuilder([candidate], 1)
      customerRepo.createQueryBuilder.mockReturnValue(qb)

      const results = await service.checkDuplicates({
        company: 'Some Corp',
      })

      // '' vs 'some corp' → Levenshtein distance = 9, maxLen = 9, similarity = 0
      expect(results).toEqual([])
    })
  })

  /* ---------- Dimension 5: Contact mobile ---------- */

  describe('contact mobile (85%)', () => {
    it('should find customer through contact mobile cross-match', async () => {
      const contact = { id: 1, customerId: 50, mobile: '15900001111' }
      contactRepo.find.mockResolvedValue([contact])
      const customer = fixtures.customer({ id: 50, name: 'Cross Match Co' })
      customerRepo.findOne.mockResolvedValue(customer)

      const results = await service.checkDuplicates({
        contactMobile: '15900001111',
      })

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('contact_mobile')
      expect(results[0].confidence).toBe(85)
      expect(results[0].customer.id).toBe(50)
    })

    it('should return empty when no contact matches', async () => {
      contactRepo.find.mockResolvedValue([])

      const results = await service.checkDuplicates({
        contactMobile: '19999999999',
      })

      expect(results).toEqual([])
    })

    it('should skip if customer not found for contactId', async () => {
      contactRepo.find.mockResolvedValue([
        { id: 1, customerId: 999, mobile: '15900001111' },
      ])
      customerRepo.findOne.mockResolvedValue(null)

      const results = await service.checkDuplicates({
        contactMobile: '15900001111',
      })

      expect(results).toEqual([])
    })

    it('should deduplicate contacts from same customer', async () => {
      contactRepo.find.mockResolvedValue([
        { id: 1, customerId: 60, mobile: '15900001111' },
        { id: 2, customerId: 60, mobile: '15900001111' },
      ])
      const customer = fixtures.customer({ id: 60 })
      customerRepo.findOne.mockResolvedValue(customer)

      const results = await service.checkDuplicates({
        contactMobile: '15900001111',
      })

      // Should only appear once (deduplicated by Set)
      expect(results).toHaveLength(1)
      expect(results[0].customer.id).toBe(60)
    })
  })

  /* ---------- Deduplication ---------- */

  describe('deduplication', () => {
    it('should keep highest confidence when same customer matched by multiple dimensions', async () => {
      const customer = fixtures.customer({
        id: 70,
        phone: '13800138000',
        email: 'shared@example.com',
      })

      // First call for phone (95%), second for email (90%)
      customerRepo.find
        .mockResolvedValueOnce([customer]) // phone
        .mockResolvedValueOnce([customer]) // email

      const results = await service.checkDuplicates({
        phone: '13800138000',
        email: 'shared@example.com',
      })

      expect(results).toHaveLength(1)
      expect(results[0].confidence).toBe(95) // phone wins
      expect(results[0].matchType).toBe('phone')
    })

    it('should keep credit code match (100%) over phone (95%)', async () => {
      const customer = fixtures.customer({ id: 80 })

      customerRepo.find
        .mockResolvedValueOnce([customer]) // credit code: 100%
        .mockResolvedValueOnce([customer]) // phone: 95%

      const results = await service.checkDuplicates({
        unifiedCreditCode: 'CODE123',
        phone: '13800138000',
      })

      expect(results).toHaveLength(1)
      expect(results[0].confidence).toBe(100)
      expect(results[0].matchType).toBe('unified_credit_code')
    })
  })

  /* ---------- Multiple customers from different dimensions ---------- */

  describe('multi-customer results', () => {
    it('should return distinct customers from different dimensions', async () => {
      const custA = fixtures.customer({ id: 90, phone: '13800138000' })
      const custB = fixtures.customer({ id: 91, email: 'b@example.com' })

      customerRepo.find
        .mockResolvedValueOnce([custA]) // phone
        .mockResolvedValueOnce([custB]) // email

      const results = await service.checkDuplicates({
        phone: '13800138000',
        email: 'b@example.com',
      })

      expect(results).toHaveLength(2)
      const ids = results.map((r: DuplicateResult) => r.customer.id).sort()
      expect(ids).toEqual([90, 91])
    })
  })
})
