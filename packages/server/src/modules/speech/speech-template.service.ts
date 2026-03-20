import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SpeechTemplate } from './entities/speech-template.entity'
import { SpeechCategory } from './entities/speech-category.entity'
import { CreateSpeechTemplateDto } from './dto/create-speech-template.dto'
import { UpdateSpeechTemplateDto } from './dto/update-speech-template.dto'
import { QuerySpeechTemplateDto } from './dto/query-speech-template.dto'
import { SpeechTemplateStatus } from '@crm/shared'

@Injectable()
export class SpeechTemplateService {
  constructor(
    @InjectRepository(SpeechTemplate)
    private readonly templateRepo: Repository<SpeechTemplate>,
    @InjectRepository(SpeechCategory)
    private readonly categoryRepo: Repository<SpeechCategory>,
  ) {}

  async findAll(query: QuerySpeechTemplateDto) {
    const { page = 1, pageSize = 20, keyword, categoryId, status } = query
    const qb = this.templateRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .orderBy('t.createdAt', 'DESC')

    if (keyword) {
      qb.andWhere('(t.title LIKE :kw OR t.content LIKE :kw)', { kw: `%${keyword}%` })
    }
    if (categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId })
    }
    if (status) {
      qb.andWhere('t.status = :status', { status })
    }

    qb.skip((page - 1) * pageSize).take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number) {
    const template = await this.templateRepo.findOne({
      where: { id },
      relations: ['category'],
    })
    if (!template) throw new NotFoundException('话术模板不存在')
    return template
  }

  async create(dto: CreateSpeechTemplateDto, userId: number) {
    const entity = this.templateRepo.create({
      ...dto,
      createdBy: userId,
      status: dto.status ?? SpeechTemplateStatus.DRAFT,
    })
    return this.templateRepo.save(entity)
  }

  async update(id: number, dto: UpdateSpeechTemplateDto) {
    const template = await this.findOne(id)
    Object.assign(template, dto)
    return this.templateRepo.save(template)
  }

  async remove(id: number) {
    const template = await this.findOne(id)
    return this.templateRepo.softRemove(template)
  }

  async exportCsv(): Promise<string> {
    const templates = await this.templateRepo.find({
      where: { status: SpeechTemplateStatus.PUBLISHED },
      relations: ['category'],
      order: { categoryId: 'ASC', createdAt: 'DESC' },
    })

    const BOM = '\uFEFF'
    const header = '标题,分类,内容,场景,使用次数\n'
    const rows = templates
      .map((t) => {
        const esc = (s: string | null) => `"${(s ?? '').replace(/"/g, '""')}"`
        return [
          esc(t.title),
          esc(t.category?.name ?? ''),
          esc(t.content),
          esc(t.scene),
          t.usageCount,
        ].join(',')
      })
      .join('\n')
    return BOM + header + rows
  }

  async getStatistics() {
    const stats = await this.templateRepo
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.categoryId')
      .getRawMany()
    return stats
  }

  async incrementUsageCount(templateId: number) {
    await this.templateRepo.increment({ id: templateId }, 'usageCount', 1)
  }

  /* ---------- Category CRUD ---------- */

  async findAllCategories() {
    return this.categoryRepo.find({ order: { sort: 'ASC', id: 'ASC' } })
  }

  async createCategory(data: { name: string; code: string; sort?: number }) {
    const entity = this.categoryRepo.create(data)
    return this.categoryRepo.save(entity)
  }

  async updateCategory(id: number, data: { name?: string; code?: string; sort?: number }) {
    const cat = await this.categoryRepo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException('分类不存在')
    Object.assign(cat, data)
    return this.categoryRepo.save(cat)
  }

  async removeCategory(id: number) {
    const cat = await this.categoryRepo.findOne({ where: { id } })
    if (!cat) throw new NotFoundException('分类不存在')
    return this.categoryRepo.softRemove(cat)
  }
}
