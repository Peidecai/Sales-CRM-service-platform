import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { ProductService } from '../../src/modules/product/product.service'
import { Product } from '../../src/modules/product/entities/product.entity'
import { OpportunityProduct } from '../../src/modules/product/entities/opportunity-product.entity'
import { ProductStatus } from '@crm/shared'
import { createMockRepository, createMockQueryBuilder } from '../test-utils'
import type { MockRepository } from '../test-utils'

describe('ProductService', () => {
  let service: ProductService
  let productRepo: MockRepository<Product>
  let oppProductRepo: MockRepository<OpportunityProduct>

  beforeEach(async () => {
    productRepo = createMockRepository<Product>()
    oppProductRepo = createMockRepository<OpportunityProduct>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(OpportunityProduct), useValue: oppProductRepo },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
  })

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    code: 'P001',
    categoryId: 1,
    category: { id: 1, name: 'Category 1' },
    price: 99.99,
    unit: '个',
    status: ProductStatus.ACTIVE,
    description: 'desc',
    specs: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  describe('create', () => {
    it('should create a product', async () => {
      productRepo.findOne.mockResolvedValue(null)
      productRepo.create.mockReturnValue(mockProduct)
      productRepo.save.mockResolvedValue(mockProduct)

      const result = await service.create({
        name: 'Test Product',
        code: 'P001',
        price: 99.99,
        unit: '个',
      })
      expect(result).toEqual(mockProduct)
      expect(productRepo.create).toHaveBeenCalled()
    })

    it('should throw ConflictException for duplicate code', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct)
      await expect(
        service.create({ name: 'New', code: 'P001', price: 10, unit: '个' }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const qb = createMockQueryBuilder([mockProduct], 1)
      productRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 })
      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('should filter by keyword', async () => {
      const qb = createMockQueryBuilder([], 0)
      productRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, keyword: 'test' })
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(product.name LIKE :kw OR product.code LIKE :kw)',
        { kw: '%test%' },
      )
    })

    it('should filter by categoryId', async () => {
      const qb = createMockQueryBuilder([], 0)
      productRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, categoryId: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('product.categoryId = :categoryId', { categoryId: 1 })
    })

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder([], 0)
      productRepo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, status: ProductStatus.ACTIVE })
      expect(qb.andWhere).toHaveBeenCalledWith('product.status = :status', { status: 'active' })
    })
  })

  describe('findOne', () => {
    it('should return a product by id', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct)
      const result = await service.findOne(1)
      expect(result).toEqual(mockProduct)
    })

    it('should throw NotFoundException if not found', async () => {
      productRepo.findOne.mockResolvedValue(null)
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('should update a product', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct })
      productRepo.save.mockImplementation(async (e) => e as Product)

      const result = await service.update(1, { name: 'Updated' })
      expect(result.name).toBe('Updated')
    })

    it('should throw ConflictException when changing to existing code', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({ ...mockProduct }) // findOne for the product (code: P001)
        .mockResolvedValueOnce({ ...mockProduct, id: 2, code: 'P002' }) // findOne for code check — existing product with code P002

      await expect(service.update(1, { code: 'P002' })).rejects.toThrow(ConflictException)
    })

    it('should throw NotFoundException for non-existing product', async () => {
      productRepo.findOne.mockResolvedValue(null)
      await expect(service.update(999, { name: 'x' })).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should soft remove a product', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct)
      productRepo.softRemove.mockResolvedValue(mockProduct)

      await service.remove(1)
      expect(productRepo.softRemove).toHaveBeenCalledWith(mockProduct)
    })

    it('should throw NotFoundException for non-existing product', async () => {
      productRepo.findOne.mockResolvedValue(null)
      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('findByIds', () => {
    it('should return empty array for empty ids', async () => {
      const result = await service.findByIds([])
      expect(result).toEqual([])
    })

    it('should return products by ids', async () => {
      const qb = createMockQueryBuilder([mockProduct])
      productRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findByIds([1])
      expect(result).toHaveLength(1)
    })
  })

  describe('getOpportunityProducts', () => {
    it('should return products linked to opportunity', async () => {
      const oppProduct = { id: 1, opportunityId: 1, productId: 1, product: mockProduct }
      oppProductRepo.find.mockResolvedValue([oppProduct])

      const result = await service.getOpportunityProducts(1)
      expect(result).toHaveLength(1)
    })
  })

  describe('linkProducts', () => {
    it('should link products to opportunity', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct)
      oppProductRepo.create.mockImplementation((data) => data as OpportunityProduct)
      oppProductRepo.save.mockImplementation(async (e) => e as OpportunityProduct)

      const result = await service.linkProducts(1, [
        { productId: 1, quantity: 2, unitPrice: 100, discount: 90 },
      ])
      expect(result).toHaveLength(1)
      expect(oppProductRepo.save).toHaveBeenCalled()
    })

    it('should throw NotFoundException for non-existing product', async () => {
      productRepo.findOne.mockResolvedValue(null)
      await expect(
        service.linkProducts(1, [{ productId: 999, quantity: 1, unitPrice: 100, discount: 100 }]),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('unlinkProduct', () => {
    it('should remove the link', async () => {
      const oppProduct = { id: 1, opportunityId: 1, productId: 1 }
      oppProductRepo.findOne.mockResolvedValue(oppProduct)
      oppProductRepo.remove.mockResolvedValue(oppProduct)

      await service.unlinkProduct(1, 1)
      expect(oppProductRepo.remove).toHaveBeenCalledWith(oppProduct)
    })

    it('should throw NotFoundException if link not found', async () => {
      oppProductRepo.findOne.mockResolvedValue(null)
      await expect(service.unlinkProduct(1, 999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('exportCsv', () => {
    it('should return CSV string with BOM', async () => {
      productRepo.find.mockResolvedValue([mockProduct])
      const csv = await service.exportCsv()
      expect(csv.startsWith('\uFEFF')).toBe(true)
      expect(csv).toContain('产品编码')
      expect(csv).toContain('P001')
    })

    it('should handle empty list', async () => {
      productRepo.find.mockResolvedValue([])
      const csv = await service.exportCsv()
      expect(csv).toContain('产品编码')
    })
  })
})
