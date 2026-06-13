import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { MaterialService } from '../../src/modules/material/material.service'
import { MaterialFile } from '../../src/modules/material/entities/material-file.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../test-utils'

describe('MaterialService', () => {
  let service: MaterialService
  let repo: MockRepository<MaterialFile>

  beforeEach(async () => {
    repo = createMockRepository<MaterialFile>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService,
        { provide: getRepositoryToken(MaterialFile), useValue: repo },
      ],
    }).compile()

    service = module.get(MaterialService)
  })

  const mockFile = {
    id: 1,
    name: 'test-image.png',
    ossKey: 'uploads/2025/01/test-image.png',
    ossBucket: 'crm-materials',
    fileSize: 102400,
    mimeType: 'image/png',
    md5: 'abc123',
    thumbnailKey: null,
    width: 800,
    height: 600,
    durationSeconds: null,
    extraMeta: null,
    category: 'images',
    createdBy: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  describe('findAll', () => {
    it('should return paginated list with filters', async () => {
      const list = [mockFile]
      const qb = createMockQueryBuilder(list, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ category: 'images', mimeType: 'image', page: 1, pageSize: 10 })

      expect(result).toEqual({ list, total: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('m.category = :category', { category: 'images' })
      expect(qb.andWhere).toHaveBeenCalledWith('m.mimeType LIKE :mimeType', { mimeType: 'image%' })
      expect(qb.orderBy).toHaveBeenCalledWith('m.createdAt', 'DESC')
      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('should use default page/pageSize when not provided', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({})

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(qb.andWhere).not.toHaveBeenCalled()
    })
  })

  describe('findOne', () => {
    it('should return material by id', async () => {
      repo.findOne.mockResolvedValue(mockFile)

      const result = await service.findOne(1)

      expect(result).toEqual(mockFile)
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update name and category', async () => {
      const existing = { ...mockFile }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockImplementation((e) => Promise.resolve(e))

      const result = await service.update(1, { name: 'renamed.png', category: 'documents' })

      expect(result.name).toBe('renamed.png')
      expect(result.category).toBe('documents')
      expect(repo.save).toHaveBeenCalled()
    })

    it('should only update provided fields', async () => {
      const existing = { ...mockFile }
      repo.findOne.mockResolvedValue(existing)
      repo.save.mockImplementation((e) => Promise.resolve(e))

      const result = await service.update(1, { name: 'new-name.png' })

      expect(result.name).toBe('new-name.png')
      expect(result.category).toBe('images')
    })
  })

  describe('remove', () => {
    it('should soft-remove material', async () => {
      repo.findOne.mockResolvedValue(mockFile)
      repo.softRemove.mockResolvedValue(undefined)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(mockFile)
    })

    it('should throw NotFoundException when removing non-existent', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('createFromCallback', () => {
    it('should create material from OSS callback data', async () => {
      const callbackData = {
        name: 'video.mp4',
        ossKey: 'uploads/video.mp4',
        ossBucket: 'crm-materials',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        durationSeconds: 120,
        createdBy: 2,
      }
      repo.create.mockReturnValue({ ...mockFile, ...callbackData })
      repo.save.mockResolvedValue({ ...mockFile, ...callbackData, id: 2 })

      const result = await service.createFromCallback(callbackData)

      expect(result.name).toBe('video.mp4')
      expect(result.mimeType).toBe('video/mp4')
      expect(repo.create).toHaveBeenCalledWith(callbackData)
      expect(repo.save).toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    it('should aggregate file stats by type', async () => {
      repo.find.mockResolvedValue([
        { mimeType: 'image/png' },
        { mimeType: 'image/jpeg' },
        { mimeType: 'video/mp4' },
        { mimeType: null },
      ])

      const result = await service.getStats()

      expect(result.total).toBe(4)
      expect(result.byType).toEqual({ image: 2, video: 1, other: 1 })
    })

    it('should return empty stats when no files', async () => {
      repo.find.mockResolvedValue([])

      const result = await service.getStats()

      expect(result).toEqual({ byType: {}, total: 0 })
    })
  })
})
