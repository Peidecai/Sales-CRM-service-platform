import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductCategory } from './entities/product-category.entity'
import { Product } from './entities/product.entity'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'

interface CategoryTreeNode {
  id: number
  name: string
  parentId: number | null
  sort: number
  children: CategoryTreeNode[]
}

@Injectable()
export class ProductCategoryService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.categoryRepo.find({ order: { sort: 'ASC', id: 'ASC' } })
    return this.buildTree(categories)
  }

  async create(dto: CreateProductCategoryDto): Promise<ProductCategory> {
    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } })
      if (!parent) {
        throw new NotFoundException(`父分类 ${dto.parentId} 不存在`)
      }
    }
    const category = this.categoryRepo.create(dto)
    return this.categoryRepo.save(category)
  }

  async update(id: number, dto: Partial<CreateProductCategoryDto>): Promise<ProductCategory> {
    const category = await this.categoryRepo.findOne({ where: { id } })
    if (!category) {
      throw new NotFoundException(`分类 ${id} 不存在`)
    }
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('分类不能设置自身为父分类')
      }
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } })
      if (!parent) {
        throw new NotFoundException(`父分类 ${dto.parentId} 不存在`)
      }
    }
    Object.assign(category, dto)
    return this.categoryRepo.save(category)
  }

  async remove(id: number): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { id } })
    if (!category) {
      throw new NotFoundException(`分类 ${id} 不存在`)
    }
    // Check for children
    const childCount = await this.categoryRepo.count({ where: { parentId: id } })
    if (childCount > 0) {
      throw new BadRequestException('该分类下存在子分类，无法删除')
    }
    // Check for products
    const productCount = await this.productRepo.count({ where: { categoryId: id } })
    if (productCount > 0) {
      throw new BadRequestException('该分类下存在产品，无法删除')
    }
    await this.categoryRepo.softRemove(category)
  }

  private buildTree(categories: ProductCategory[]): CategoryTreeNode[] {
    const map = new Map<number, CategoryTreeNode>()
    const roots: CategoryTreeNode[] = []

    for (const c of categories) {
      map.set(c.id, { id: c.id, name: c.name, parentId: c.parentId, sort: c.sort, children: [] })
    }

    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }
}
