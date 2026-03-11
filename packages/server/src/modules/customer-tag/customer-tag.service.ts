import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerTag } from './entities/customer-tag.entity'
import { CustomerTagRelation } from './entities/customer-tag-relation.entity'
import { CreateTagDto } from './dto'

@Injectable()
export class CustomerTagService {
  constructor(
    @InjectRepository(CustomerTag)
    private readonly tagRepo: Repository<CustomerTag>,
    @InjectRepository(CustomerTagRelation)
    private readonly relationRepo: Repository<CustomerTagRelation>,
  ) {}

  async findAll(group?: string): Promise<CustomerTag[]> {
    const where: Record<string, unknown> = { deleted: false }
    if (group) where['group'] = group
    return this.tagRepo.find({ where, order: { sort: 'ASC', createdAt: 'DESC' } })
  }

  async findByName(name: string): Promise<CustomerTag | null> {
    return this.tagRepo.findOne({ where: { name, deleted: false } })
  }

  async create(dto: CreateTagDto): Promise<CustomerTag> {
    const existing = await this.findByName(dto.name)
    if (existing) {
      throw new ConflictException(`标签"${dto.name}"已存在`)
    }
    const tag = this.tagRepo.create(dto)
    return this.tagRepo.save(tag)
  }

  async update(id: number, dto: Partial<CreateTagDto>): Promise<CustomerTag> {
    const tag = await this.tagRepo.findOne({ where: { id, deleted: false } })
    if (!tag) throw new NotFoundException(`Tag ${id} not found`)

    if (dto.name && dto.name !== tag.name) {
      const existing = await this.findByName(dto.name)
      if (existing) throw new ConflictException(`标签"${dto.name}"已存在`)
    }

    Object.assign(tag, dto)
    return this.tagRepo.save(tag)
  }

  async remove(id: number): Promise<void> {
    const tag = await this.tagRepo.findOne({ where: { id, deleted: false } })
    if (!tag) throw new NotFoundException(`Tag ${id} not found`)

    tag.deleted = true
    await this.tagRepo.save(tag)
    // Remove all relations for this tag
    await this.relationRepo.delete({ tagId: id })
  }

  async addTagToCustomer(customerId: number, tagId: number): Promise<void> {
    const existing = await this.relationRepo.findOne({
      where: { customerId, tagId },
    })
    if (existing) return // Already tagged, skip

    const relation = this.relationRepo.create({ customerId, tagId })
    await this.relationRepo.save(relation)
  }

  async removeTagFromCustomer(customerId: number, tagId: number): Promise<void> {
    await this.relationRepo.delete({ customerId, tagId })
  }

  async batchAddTags(customerIds: number[], tagIds: number[]): Promise<void> {
    for (const customerId of customerIds) {
      for (const tagId of tagIds) {
        await this.addTagToCustomer(customerId, tagId)
      }
    }
  }

  async getTagsByCustomer(customerId: number): Promise<CustomerTag[]> {
    const relations = await this.relationRepo.find({ where: { customerId } })
    if (relations.length === 0) return []

    const tagIds = relations.map((r) => r.tagId)
    return this.tagRepo
      .createQueryBuilder('tag')
      .where('tag.id IN (:...tagIds)', { tagIds })
      .andWhere('tag.deleted = false')
      .orderBy('tag.sort', 'ASC')
      .getMany()
  }
}
