import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ForumCategory } from './entities/forum-category.entity'
import { CreateForumCategoryDto } from './dto/create-forum-category.dto'

@Injectable()
export class ForumCategoryService {
  constructor(
    @InjectRepository(ForumCategory)
    private readonly categoryRepo: Repository<ForumCategory>,
  ) {}

  async create(dto: CreateForumCategoryDto): Promise<ForumCategory> {
    const category = this.categoryRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      icon: dto.icon ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    })
    return this.categoryRepo.save(category)
  }

  async findAll(): Promise<ForumCategory[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    })
  }

  async findOne(id: number): Promise<ForumCategory> {
    const category = await this.categoryRepo.findOne({ where: { id } })
    if (!category) {
      throw new NotFoundException('分类不存在')
    }
    return category
  }

  async update(id: number, dto: Partial<CreateForumCategoryDto>): Promise<ForumCategory> {
    const category = await this.findOne(id)
    Object.assign(category, dto)
    return this.categoryRepo.save(category)
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id)
    await this.categoryRepo.softRemove(category)
  }
}
