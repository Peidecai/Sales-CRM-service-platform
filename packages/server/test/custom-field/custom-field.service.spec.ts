import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { CustomFieldService } from '../../src/modules/custom-field/custom-field.service'
import { CustomFieldDefinition, FieldType } from '../../src/modules/custom-field/custom-field-definition.entity'
import { createMockRepository, MockRepository } from '../test-utils'

describe('CustomFieldService', () => {
  let service: CustomFieldService
  let repo: MockRepository<CustomFieldDefinition>

  beforeEach(async () => {
    repo = createMockRepository<CustomFieldDefinition>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldService,
        { provide: getRepositoryToken(CustomFieldDefinition), useValue: repo },
      ],
    }).compile()

    service = module.get(CustomFieldService)
  })

  const mockFieldDef = {
    id: 1,
    fieldKey: 'custom_size',
    fieldLabel: '企业规模',
    fieldType: FieldType.SELECT,
    options: ['小型', '中型', '大型'],
    required: false,
    defaultValue: null,
    sort: 0,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  describe('findAll', () => {
    it('should return active field definitions sorted by sort and createdAt', async () => {
      repo.find.mockResolvedValue([mockFieldDef])

      const result = await service.findAll()

      expect(result).toEqual([mockFieldDef])
      expect(repo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sort: 'ASC', createdAt: 'ASC' },
      })
    })
  })

  describe('findOne', () => {
    it('should return field definition by id', async () => {
      repo.findOne.mockResolvedValue(mockFieldDef)

      const result = await service.findOne(1)

      expect(result).toEqual(mockFieldDef)
    })

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('should create a new custom field', async () => {
      const dto = {
        fieldKey: 'new_field',
        fieldLabel: '新字段',
        fieldType: FieldType.TEXT,
      }
      repo.findOne.mockResolvedValue(null)
      repo.create.mockReturnValue({ ...mockFieldDef, ...dto })
      repo.save.mockResolvedValue({ ...mockFieldDef, ...dto, id: 2 })

      const result = await service.create(dto)

      expect(result.fieldKey).toBe('new_field')
      expect(repo.create).toHaveBeenCalledWith(dto)
    })

    it('should throw ConflictException when fieldKey already exists', async () => {
      const dto = {
        fieldKey: 'custom_size',
        fieldLabel: '重复字段',
        fieldType: FieldType.TEXT,
      }
      repo.findOne.mockResolvedValue(mockFieldDef)

      await expect(service.create(dto)).rejects.toThrow(ConflictException)
    })
  })

  describe('update', () => {
    it('should update field definition', async () => {
      repo.findOne.mockResolvedValue({ ...mockFieldDef })
      repo.save.mockImplementation((e) => Promise.resolve(e))

      const result = await service.update(1, { fieldLabel: '更新后的标签' })

      expect(result.fieldLabel).toBe('更新后的标签')
    })

    it('should check for fieldKey conflict when changing fieldKey', async () => {
      // First call: findOne(id=1) returns original
      // Second call: findOne(fieldKey='existing_key') returns conflict
      repo.findOne
        .mockResolvedValueOnce({ ...mockFieldDef })
        .mockResolvedValueOnce({ ...mockFieldDef, id: 2, fieldKey: 'existing_key' })

      await expect(
        service.update(1, { fieldKey: 'existing_key' }),
      ).rejects.toThrow(ConflictException)
    })

    it('should allow keeping the same fieldKey', async () => {
      repo.findOne.mockResolvedValue({ ...mockFieldDef })
      repo.save.mockImplementation((e) => Promise.resolve(e))

      const result = await service.update(1, { fieldKey: 'custom_size', fieldLabel: 'New Label' })

      expect(result.fieldLabel).toBe('New Label')
      // findOne should only be called once (for the entity lookup), not for duplicate check
      expect(repo.findOne).toHaveBeenCalledTimes(1)
    })
  })

  describe('remove', () => {
    it('should soft-remove field definition', async () => {
      repo.findOne.mockResolvedValue(mockFieldDef)
      repo.softRemove.mockResolvedValue(undefined)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(mockFieldDef)
    })
  })

  describe('validateCustomFields', () => {
    beforeEach(() => {
      repo.find.mockResolvedValue([
        {
          ...mockFieldDef,
          fieldKey: 'required_text',
          fieldLabel: '必填文本',
          fieldType: FieldType.TEXT,
          required: true,
          isActive: true,
        },
        {
          ...mockFieldDef,
          id: 2,
          fieldKey: 'number_field',
          fieldLabel: '数字字段',
          fieldType: FieldType.NUMBER,
          required: false,
          isActive: true,
        },
        {
          ...mockFieldDef,
          id: 3,
          fieldKey: 'select_field',
          fieldLabel: '选择字段',
          fieldType: FieldType.SELECT,
          options: ['A', 'B', 'C'],
          required: false,
          isActive: true,
        },
        {
          ...mockFieldDef,
          id: 4,
          fieldKey: 'date_field',
          fieldLabel: '日期字段',
          fieldType: FieldType.DATE,
          required: false,
          isActive: true,
        },
        {
          ...mockFieldDef,
          id: 5,
          fieldKey: 'multi_field',
          fieldLabel: '多选字段',
          fieldType: FieldType.MULTI_SELECT,
          options: ['X', 'Y'],
          required: false,
          isActive: true,
        },
      ])
    })

    it('should pass when all validations succeed', async () => {
      await expect(
        service.validateCustomFields({
          required_text: 'hello',
          number_field: 42,
          select_field: 'A',
          date_field: '2025-06-01',
          multi_field: ['X'],
        }),
      ).resolves.toBeUndefined()
    })

    it('should throw when required field is missing', async () => {
      await expect(
        service.validateCustomFields({ number_field: 10 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw when number field receives non-number', async () => {
      await expect(
        service.validateCustomFields({ required_text: 'ok', number_field: 'not_a_number' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw when select value is not in options', async () => {
      await expect(
        service.validateCustomFields({ required_text: 'ok', select_field: 'INVALID' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw when date format is invalid', async () => {
      await expect(
        service.validateCustomFields({ required_text: 'ok', date_field: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw when multi_select value is not an array', async () => {
      await expect(
        service.validateCustomFields({ required_text: 'ok', multi_field: 'not_array' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should return early when customFields is null', async () => {
      await expect(
        service.validateCustomFields(null as unknown as Record<string, unknown>),
      ).resolves.toBeUndefined()
      expect(repo.find).not.toHaveBeenCalled()
    })
  })
})
