import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { QuestionCategory } from './entities/question-category.entity'
import { CreateQuestionCategoryDto } from './dto/create-question-category.dto'

export interface CategoryTreeNode {
  id: number
  name: string
  description: string | null
  parentId: number | null
  sortOrder: number
  children: CategoryTreeNode[]
}

@Injectable()
export class QuestionCategoryService {
  constructor(
    @InjectRepository(QuestionCategory)
    private readonly repo: Repository<QuestionCategory>,
  ) {}

  async getTree(): Promise<CategoryTreeNode[]> {
    const all = await this.repo.find({ order: { sortOrder: 'ASC', id: 'ASC' } })
    return this.buildTree(all, null)
  }

  private buildTree(items: QuestionCategory[], parentId: number | null): CategoryTreeNode[] {
    return items
      .filter((i) => i.parentId === parentId)
      .map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        parentId: i.parentId,
        sortOrder: i.sortOrder,
        children: this.buildTree(items, i.id),
      }))
  }

  async create(dto: CreateQuestionCategoryDto): Promise<QuestionCategory> {
    const entity = this.repo.create(dto)
    return this.repo.save(entity)
  }

  async update(id: number, dto: Partial<CreateQuestionCategoryDto>): Promise<QuestionCategory> {
    const cat = await this.repo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException('题目分类不存在')
    Object.assign(cat, dto)
    return this.repo.save(cat)
  }

  async remove(id: number): Promise<QuestionCategory> {
    const cat = await this.repo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException('题目分类不存在')
    return this.repo.softRemove(cat)
  }
}
