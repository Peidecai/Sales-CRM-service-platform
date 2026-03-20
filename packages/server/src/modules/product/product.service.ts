import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Product } from './entities/product.entity'
import { OpportunityProduct } from './entities/opportunity-product.entity'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { QueryProductDto } from './dto/query-product.dto'
import { LinkProductItemDto } from './dto/link-product.dto'

export interface ProductPageResult {
  list: Product[]
  total: number
  page: number
  pageSize: number
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(OpportunityProduct)
    private readonly oppProductRepo: Repository<OpportunityProduct>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    // Check unique code
    const existing = await this.productRepo.findOne({ where: { code: dto.code } })
    if (existing) {
      throw new ConflictException(`产品编码 ${dto.code} 已存在`)
    }
    const product = this.productRepo.create(dto)
    return this.productRepo.save(product)
  }

  async findAll(query: QueryProductDto): Promise<ProductPageResult> {
    const { page = 1, pageSize = 20, keyword, categoryId, status } = query

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')

    if (keyword) {
      qb.andWhere('(product.name LIKE :kw OR product.code LIKE :kw)', { kw: `%${keyword}%` })
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId })
    }

    if (status) {
      qb.andWhere('product.status = :status', { status })
    }

    qb.orderBy('product.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category'],
    })
    if (!product) {
      throw new NotFoundException(`产品 ${id} 不存在`)
    }
    return product
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id)

    if (dto.code && dto.code !== product.code) {
      const existing = await this.productRepo.findOne({ where: { code: dto.code } })
      if (existing) {
        throw new ConflictException(`产品编码 ${dto.code} 已存在`)
      }
    }

    Object.assign(product, dto)
    return this.productRepo.save(product)
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id)
    await this.productRepo.softRemove(product)
  }

  async findByIds(ids: number[]): Promise<Product[]> {
    if (ids.length === 0) return []
    return this.productRepo
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids })
      .getMany()
  }

  // ---- Opportunity-Product linking ----

  async getOpportunityProducts(opportunityId: number): Promise<OpportunityProduct[]> {
    return this.oppProductRepo.find({
      where: { opportunityId },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    })
  }

  async linkProducts(
    opportunityId: number,
    items: LinkProductItemDto[],
  ): Promise<OpportunityProduct[]> {
    const results: OpportunityProduct[] = []
    for (const item of items) {
      // Verify product exists
      const product = await this.productRepo.findOne({ where: { id: item.productId } })
      if (!product) {
        throw new NotFoundException(`产品 ${item.productId} 不存在`)
      }

      // Calculate subtotal: quantity * unitPrice * discount / 100
      const subtotal = Math.round(item.quantity * item.unitPrice * item.discount) / 100

      const oppProduct = this.oppProductRepo.create({
        opportunityId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal,
      })

      results.push(await this.oppProductRepo.save(oppProduct))
    }
    return results
  }

  async unlinkProduct(opportunityId: number, id: number): Promise<void> {
    const record = await this.oppProductRepo.findOne({
      where: { id, opportunityId },
    })
    if (!record) {
      throw new NotFoundException(`商机产品关联 ${id} 不存在`)
    }
    await this.oppProductRepo.remove(record)
  }

  /** Export all products as CSV string */
  async exportCsv(): Promise<string> {
    const products = await this.productRepo.find({
      relations: ['category'],
      order: { updatedAt: 'DESC' },
    })

    const statusLabels: Record<string, string> = {
      active: '上架',
      inactive: '下架',
      discontinued: '停产',
    }

    const header = '产品编码,产品名称,分类,单价,单位,状态,描述'
    const rows = products.map((p) => {
      return [
        this.escapeCsvField(p.code),
        this.escapeCsvField(p.name),
        this.escapeCsvField(p.category?.name ?? ''),
        String(p.price),
        this.escapeCsvField(p.unit),
        this.escapeCsvField(statusLabels[p.status] ?? p.status),
        this.escapeCsvField(p.description ?? ''),
      ].join(',')
    })

    return '\uFEFF' + [header, ...rows].join('\n')
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}
