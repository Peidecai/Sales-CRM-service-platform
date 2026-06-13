import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MaterialFile } from './entities/material-file.entity'

export interface MaterialListQuery {
  category?: string
  mimeType?: string
  page?: number
  pageSize?: number
}

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(MaterialFile)
    private readonly materialRepository: Repository<MaterialFile>,
  ) {}

  async findAll(query: MaterialListQuery): Promise<{ list: MaterialFile[]; total: number }> {
    const { category, mimeType, page = 1, pageSize = 20 } = query
    const qb = this.materialRepository.createQueryBuilder('m')
    if (category) qb.andWhere('m.category = :category', { category })
    if (mimeType) qb.andWhere('m.mimeType LIKE :mimeType', { mimeType: `${mimeType}%` })
    qb.orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async findOne(id: number): Promise<MaterialFile> {
    const file = await this.materialRepository.findOne({ where: { id } })
    if (!file) throw new NotFoundException(`Material ${id} not found`)
    return file
  }

  async update(id: number, updates: { name?: string; category?: string }): Promise<MaterialFile> {
    const file = await this.findOne(id)
    if (updates.name !== undefined) file.name = updates.name
    if (updates.category !== undefined) file.category = updates.category
    return this.materialRepository.save(file)
  }

  async remove(id: number): Promise<void> {
    const file = await this.findOne(id)
    await this.materialRepository.softRemove(file)
  }

  async createFromCallback(data: {
    name: string
    ossKey: string
    ossBucket: string
    fileSize: number
    mimeType?: string
    md5?: string
    thumbnailKey?: string
    width?: number
    height?: number
    durationSeconds?: number
    extraMeta?: Record<string, unknown>
    category?: string
    createdBy?: number
  }): Promise<MaterialFile> {
    const file = this.materialRepository.create(data)
    return this.materialRepository.save(file)
  }

  async getStats(): Promise<{ byType: Record<string, number>; total: number }> {
    const list = await this.materialRepository.find({
      select: ['mimeType'],
    })
    const byType: Record<string, number> = {}
    for (const m of list) {
      const type = m.mimeType ? (m.mimeType.split('/')[0] ?? 'other') : 'other'
      byType[type] = (byType[type] ?? 0) + 1
    }
    return { byType, total: list.length }
  }
}
