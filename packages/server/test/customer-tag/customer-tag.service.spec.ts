import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { CustomerTagService } from '../../src/modules/customer-tag/customer-tag.service'
import { CustomerTag } from '../../src/modules/customer-tag/entities/customer-tag.entity'
import { CustomerTagRelation } from '../../src/modules/customer-tag/entities/customer-tag-relation.entity'
import { createMockRepository, createMockQueryBuilder, MockRepository } from '../test-utils'

describe('CustomerTagService', () => {
  let service: CustomerTagService
  let tagRepo: MockRepository<CustomerTag>
  let relationRepo: MockRepository<CustomerTagRelation>

  beforeEach(async () => {
    tagRepo = createMockRepository<CustomerTag>()
    relationRepo = createMockRepository<CustomerTagRelation>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerTagService,
        { provide: getRepositoryToken(CustomerTag), useValue: tagRepo },
        { provide: getRepositoryToken(CustomerTagRelation), useValue: relationRepo },
      ],
    }).compile()

    service = module.get(CustomerTagService)
  })

  const mockTag = {
    id: 1,
    name: 'VIP客户',
    color: '#FF0000',
    group: '等级',
    sort: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  describe('findAll', () => {
    it('should return all tags ordered by sort/createdAt', async () => {
      tagRepo.find.mockResolvedValue([mockTag])

      const result = await service.findAll()

      expect(result).toEqual([mockTag])
      expect(tagRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { sort: 'ASC', createdAt: 'DESC' },
      })
    })

    it('should filter by group when provided', async () => {
      tagRepo.find.mockResolvedValue([mockTag])

      await service.findAll('等级')

      expect(tagRepo.find).toHaveBeenCalledWith({
        where: { group: '等级' },
        order: { sort: 'ASC', createdAt: 'DESC' },
      })
    })
  })

  describe('create', () => {
    it('should create a new tag', async () => {
      tagRepo.findOne.mockResolvedValue(null)
      tagRepo.create.mockReturnValue(mockTag)
      tagRepo.save.mockResolvedValue(mockTag)

      const result = await service.create({ name: 'VIP客户', color: '#FF0000', group: '等级' })

      expect(result).toEqual(mockTag)
      expect(tagRepo.create).toHaveBeenCalled()
    })

    it('should throw ConflictException when name already exists', async () => {
      tagRepo.findOne.mockResolvedValue(mockTag)

      await expect(
        service.create({ name: 'VIP客户' }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('update', () => {
    it('should update tag fields', async () => {
      tagRepo.findOne.mockResolvedValue({ ...mockTag })
      tagRepo.save.mockImplementation((e) => Promise.resolve(e))

      const result = await service.update(1, { color: '#00FF00' })

      expect(result.color).toBe('#00FF00')
    })

    it('should throw NotFoundException when tag not found', async () => {
      tagRepo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { color: '#00FF00' })).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException when renaming to existing name', async () => {
      tagRepo.findOne
        .mockResolvedValueOnce({ ...mockTag }) // find by id
        .mockResolvedValueOnce({ ...mockTag, id: 2, name: '已有标签' }) // find by name

      await expect(
        service.update(1, { name: '已有标签' }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('remove', () => {
    it('should soft-remove tag and delete all relations', async () => {
      tagRepo.findOne.mockResolvedValue(mockTag)
      tagRepo.softRemove.mockResolvedValue(undefined)
      relationRepo.delete.mockResolvedValue({ affected: 3 })

      await service.remove(1)

      expect(tagRepo.softRemove).toHaveBeenCalledWith(mockTag)
      expect(relationRepo.delete).toHaveBeenCalledWith({ tagId: 1 })
    })

    it('should throw NotFoundException when tag not found', async () => {
      tagRepo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('addTagToCustomer', () => {
    it('should create relation when not already tagged', async () => {
      relationRepo.findOne.mockResolvedValue(null)
      relationRepo.create.mockReturnValue({ customerId: 1, tagId: 1 })
      relationRepo.save.mockResolvedValue({ id: 1, customerId: 1, tagId: 1 })

      await service.addTagToCustomer(1, 1)

      expect(relationRepo.create).toHaveBeenCalledWith({ customerId: 1, tagId: 1 })
      expect(relationRepo.save).toHaveBeenCalled()
    })

    it('should skip when already tagged', async () => {
      relationRepo.findOne.mockResolvedValue({ id: 1, customerId: 1, tagId: 1 })

      await service.addTagToCustomer(1, 1)

      expect(relationRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('removeTagFromCustomer', () => {
    it('should delete the relation', async () => {
      relationRepo.delete.mockResolvedValue({ affected: 1 })

      await service.removeTagFromCustomer(1, 1)

      expect(relationRepo.delete).toHaveBeenCalledWith({ customerId: 1, tagId: 1 })
    })
  })

  describe('batchAddTags', () => {
    it('should add tags to multiple customers', async () => {
      relationRepo.findOne.mockResolvedValue(null)
      relationRepo.create.mockImplementation((d) => d)
      relationRepo.save.mockImplementation((d) => Promise.resolve({ id: 1, ...d }))

      await service.batchAddTags([1, 2], [10, 20])

      // 2 customers x 2 tags = 4 calls
      expect(relationRepo.save).toHaveBeenCalledTimes(4)
    })
  })

  describe('getTagsByCustomer', () => {
    it('should return tags for a customer', async () => {
      relationRepo.find.mockResolvedValue([
        { customerId: 1, tagId: 1 },
        { customerId: 1, tagId: 2 },
      ])
      const qb = createMockQueryBuilder([mockTag, { ...mockTag, id: 2, name: '普通' }])
      tagRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.getTagsByCustomer(1)

      expect(result).toHaveLength(2)
      expect(qb.where).toHaveBeenCalledWith('tag.id IN (:...tagIds)', { tagIds: [1, 2] })
      expect(qb.orderBy).toHaveBeenCalledWith('tag.sort', 'ASC')
    })

    it('should return empty array when customer has no tags', async () => {
      relationRepo.find.mockResolvedValue([])

      const result = await service.getTagsByCustomer(1)

      expect(result).toEqual([])
    })
  })
})
