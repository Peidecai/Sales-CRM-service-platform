import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { QueryArticleDto } from './dto/query-article.dto'
import { CreateCategoryDto } from './dto/create-category.dto'

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly articleRepository: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeCategory)
    private readonly categoryRepository: Repository<KnowledgeCategory>,
  ) {}

  // ---- Article Methods ----

  async createArticle(dto: CreateArticleDto): Promise<KnowledgeArticle> {
    const article = this.articleRepository.create(dto)
    return this.articleRepository.save(article)
  }

  async findAllArticles(
    query: QueryArticleDto,
  ): Promise<{ list: KnowledgeArticle[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, categoryId, isPublished } = query

    const qb = this.articleRepository
      .createQueryBuilder('article')
      .where('article.deleted = :deleted', { deleted: false })

    if (keyword) {
      qb.andWhere('article.title LIKE :kw', { kw: `%${keyword}%` })
    }

    if (categoryId !== undefined) {
      qb.andWhere('article.categoryId = :categoryId', { categoryId })
    }

    if (isPublished !== undefined) {
      qb.andWhere('article.isPublished = :isPublished', { isPublished })
    }

    qb.orderBy('article.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()

    return { list, total }
  }

  async findOneArticle(id: number): Promise<KnowledgeArticle> {
    const article = await this.articleRepository.findOne({
      where: { id, deleted: false },
    })

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`)
    }

    // Increment view count
    article.viewCount += 1
    await this.articleRepository.save(article)

    return article
  }

  async updateArticle(id: number, dto: UpdateArticleDto): Promise<KnowledgeArticle> {
    const article = await this.findOneArticle(id)
    Object.assign(article, dto)
    return this.articleRepository.save(article)
  }

  async removeArticle(id: number): Promise<void> {
    const article = await this.findOneArticle(id)
    article.deleted = true
    await this.articleRepository.save(article)
  }

  // ---- Category Methods ----

  async createCategory(dto: CreateCategoryDto): Promise<KnowledgeCategory> {
    const category = this.categoryRepository.create(dto)
    return this.categoryRepository.save(category)
  }

  async findAllCategories(): Promise<KnowledgeCategory[]> {
    return this.categoryRepository.find({
      where: { deleted: false },
      order: { sort: 'ASC' },
    })
  }

  async removeCategory(id: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id, deleted: false },
    })

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`)
    }

    category.deleted = true
    await this.categoryRepository.save(category)
  }
}
