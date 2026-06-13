import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ContractTemplateService } from '../../src/modules/contract/contract-template.service'
import { ContractTemplate } from '../../src/modules/contract/entities/contract-template.entity'
import { createMockRepository, createMockQueryBuilder } from '../test-utils'
import type { MockRepository } from '../test-utils'
import { NotFoundException } from '@nestjs/common'

describe('ContractTemplateService', () => {
  let service: ContractTemplateService
  let repo: MockRepository<ContractTemplate>

  beforeEach(async () => {
    repo = createMockRepository<ContractTemplate>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractTemplateService,
        { provide: getRepositoryToken(ContractTemplate), useValue: repo },
      ],
    }).compile()

    service = module.get(ContractTemplateService)
  })

  const templateFixture = {
    id: 1,
    name: 'Test Template',
    content: 'Dear {{customerName}}, this is a {{contractType}} contract.',
    category: 'sales',
    variables: [{ name: 'customerName', label: '客户名称', type: 'string', required: true }],
    isDefault: false,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  describe('findAll', () => {
    it('should return paginated templates', async () => {
      const qb = createMockQueryBuilder([templateFixture], 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 10 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('should filter by category', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 10, category: 'sales' })
      expect(qb.andWhere).toHaveBeenCalledWith('t.category = :category', { category: 'sales' })
    })
  })

  describe('findOne', () => {
    it('should return template by id', async () => {
      repo.findOne.mockResolvedValue(templateFixture)
      const result = await service.findOne(1)
      expect(result.name).toBe('Test Template')
    })

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('should create a template', async () => {
      repo.create.mockReturnValue(templateFixture)
      repo.save.mockResolvedValue(templateFixture)

      const result = await service.create({ name: 'Test', content: 'Content' }, 1)
      expect(repo.create).toHaveBeenCalled()
      expect(result.name).toBe('Test Template')
    })
  })

  describe('update', () => {
    it('should update a template', async () => {
      repo.findOne.mockResolvedValue({ ...templateFixture })
      repo.save.mockImplementation(async (e) => e)

      const result = await service.update(1, { name: 'Updated' })
      expect(result.name).toBe('Updated')
    })
  })

  describe('remove', () => {
    it('should soft remove a template', async () => {
      repo.findOne.mockResolvedValue(templateFixture)
      repo.softRemove.mockResolvedValue(templateFixture)

      await service.remove(1)
      expect(repo.softRemove).toHaveBeenCalledWith(templateFixture)
    })
  })

  describe('renderTemplate', () => {
    it('should replace variables in content', () => {
      const result = service.renderTemplate(
        'Hello {{name}}, your {{type}} is ready.',
        { name: 'Alice', type: 'contract' },
      )
      expect(result).toBe('Hello Alice, your contract is ready.')
    })

    it('should handle multiple occurrences of same variable', () => {
      const result = service.renderTemplate(
        '{{x}} and {{x}}',
        { x: 'test' },
      )
      expect(result).toBe('test and test')
    })

    it('should leave unmatched placeholders as-is', () => {
      const result = service.renderTemplate('{{known}} and {{unknown}}', { known: 'A' })
      expect(result).toBe('A and {{unknown}}')
    })
  })
})
