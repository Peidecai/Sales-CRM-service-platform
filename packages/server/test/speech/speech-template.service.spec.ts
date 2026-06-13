import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SpeechTemplateService } from '../../src/modules/speech/speech-template.service'
import { SpeechTemplate } from '../../src/modules/speech/entities/speech-template.entity'
import { SpeechCategory } from '../../src/modules/speech/entities/speech-category.entity'
import { createMockRepository, createMockQueryBuilder } from '../test-utils'
import type { MockRepository } from '../test-utils'
import { SpeechTemplateStatus } from '@crm/shared'

describe('SpeechTemplateService', () => {
  let service: SpeechTemplateService
  let templateRepo: MockRepository
  let categoryRepo: MockRepository

  beforeEach(async () => {
    templateRepo = createMockRepository()
    categoryRepo = createMockRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeechTemplateService,
        { provide: getRepositoryToken(SpeechTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(SpeechCategory), useValue: categoryRepo },
      ],
    }).compile()

    service = module.get(SpeechTemplateService)
  })

  describe('findAll', () => {
    it('should return paginated templates', async () => {
      const templates = [{ id: 1, title: 'Test' }]
      const qb = createMockQueryBuilder(templates, 1)
      templateRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 })
      expect(result).toEqual({ list: templates, total: 1, page: 1, pageSize: 20 })
    })

    it('should filter by keyword', async () => {
      const qb = createMockQueryBuilder([], 0)
      templateRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ keyword: 'hello' })
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(t.title LIKE :kw OR t.content LIKE :kw)',
        { kw: '%hello%' },
      )
    })

    it('should filter by categoryId', async () => {
      const qb = createMockQueryBuilder([], 0)
      templateRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ categoryId: 3 })
      expect(qb.andWhere).toHaveBeenCalledWith('t.categoryId = :categoryId', { categoryId: 3 })
    })

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder([], 0)
      templateRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ status: SpeechTemplateStatus.PUBLISHED })
      expect(qb.andWhere).toHaveBeenCalledWith('t.status = :status', { status: 'published' })
    })
  })

  describe('findOne', () => {
    it('should return template with category', async () => {
      const template = { id: 1, title: 'Test', category: { id: 1, name: 'Opening' } }
      templateRepo.findOne.mockResolvedValue(template)

      const result = await service.findOne(1)
      expect(result).toEqual(template)
    })

    it('should throw NotFoundException', async () => {
      templateRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow('话术模板不存在')
    })
  })

  describe('create', () => {
    it('should create template with createdBy', async () => {
      const dto = { title: 'T', content: 'C', categoryId: 1 }
      templateRepo.create.mockReturnValue({ ...dto, id: 1, createdBy: 5, status: 'draft' })
      templateRepo.save.mockImplementation(async (e) => e)

      const result = await service.create(dto, 5)
      expect(templateRepo.create).toHaveBeenCalledWith({
        ...dto,
        createdBy: 5,
        status: SpeechTemplateStatus.DRAFT,
      })
      expect(result.createdBy).toBe(5)
    })
  })

  describe('update', () => {
    it('should update template', async () => {
      const existing = { id: 1, title: 'Old', content: 'Old', category: {} }
      templateRepo.findOne.mockResolvedValue(existing)
      templateRepo.save.mockImplementation(async (e) => e)

      const result = await service.update(1, { title: 'New' })
      expect(result.title).toBe('New')
    })
  })

  describe('remove', () => {
    it('should soft remove template', async () => {
      const existing = { id: 1, title: 'Test', category: {} }
      templateRepo.findOne.mockResolvedValue(existing)
      templateRepo.softRemove.mockImplementation(async (e) => e)

      await service.remove(1)
      expect(templateRepo.softRemove).toHaveBeenCalledWith(existing)
    })
  })

  describe('exportCsv', () => {
    it('should generate CSV with BOM', async () => {
      templateRepo.find.mockResolvedValue([
        { title: 'T1', content: 'C1', category: { name: 'Cat' }, scene: 'S1', usageCount: 5 },
      ])

      const csv = await service.exportCsv()
      expect(csv).toContain('\uFEFF')
      expect(csv).toContain('标题,分类,内容,场景,使用次数')
      expect(csv).toContain('"T1"')
    })
  })

  describe('getStatistics', () => {
    it('should return grouped stats', async () => {
      const stats = [{ categoryId: 1, count: '5' }]
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue(stats)
      templateRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getStatistics()
      expect(result).toEqual(stats)
    })
  })

  describe('incrementUsageCount', () => {
    it('should call increment', async () => {
      templateRepo.increment.mockResolvedValue({})
      await service.incrementUsageCount(1)
      expect(templateRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'usageCount', 1)
    })
  })

  describe('category CRUD', () => {
    it('findAllCategories returns ordered categories', async () => {
      categoryRepo.find.mockResolvedValue([{ id: 1 }])
      const result = await service.findAllCategories()
      expect(result).toHaveLength(1)
    })

    it('createCategory saves new category', async () => {
      categoryRepo.create.mockReturnValue({ name: 'X', code: 'x' })
      categoryRepo.save.mockImplementation(async (e) => e)
      await service.createCategory({ name: 'X', code: 'x' })
      expect(categoryRepo.save).toHaveBeenCalled()
    })

    it('removeCategory throws if not found', async () => {
      categoryRepo.findOne.mockResolvedValue(null)
      await expect(service.removeCategory(999)).rejects.toThrow('分类不存在')
    })
  })
})
