import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Announcement } from './entities/announcement.entity'
import { AnnouncementRead } from './entities/announcement-read.entity'
import { AnnouncementPriority } from '@crm/shared'

export interface QueryAnnouncementDto {
  priority?: AnnouncementPriority
  isPinned?: boolean
  page?: number
  pageSize?: number
}

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(AnnouncementRead)
    private readonly readRepository: Repository<AnnouncementRead>,
  ) {}

  async create(dto: {
    title: string
    content?: string
    priority?: AnnouncementPriority
    isPinned?: boolean
    publishAt?: Date
    endAt?: Date
    createdBy?: number
  }): Promise<Announcement> {
    const entity = this.announcementRepository.create(dto)
    return this.announcementRepository.save(entity)
  }

  async update(
    id: number,
    dto: Partial<{
      title: string
      content: string
      priority: AnnouncementPriority
      isPinned: boolean
      publishAt: Date
      endAt: Date
    }>,
  ): Promise<Announcement> {
    const ann = await this.findOne(id)
    Object.assign(ann, dto)
    return this.announcementRepository.save(ann)
  }

  async remove(id: number): Promise<void> {
    const ann = await this.findOne(id)
    ann.deleted = true
    await this.announcementRepository.save(ann)
  }

  async findAll(query: QueryAnnouncementDto): Promise<{ list: Announcement[]; total: number }> {
    const { priority, isPinned, page = 1, pageSize = 20 } = query
    const qb = this.announcementRepository
      .createQueryBuilder('a')
      .where('a.deleted = :deleted', { deleted: false })
    if (priority) qb.andWhere('a.priority = :priority', { priority })
    if (isPinned !== undefined) qb.andWhere('a.isPinned = :isPinned', { isPinned })
    qb.orderBy('a.isPinned', 'DESC')
      .addOrderBy('a.publishAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async findOne(id: number): Promise<Announcement> {
    const ann = await this.announcementRepository.findOne({ where: { id, deleted: false } })
    if (!ann) throw new NotFoundException(`Announcement ${id} not found`)
    return ann
  }

  async markRead(userId: number, announcementId: number): Promise<void> {
    const existing = await this.readRepository.findOne({
      where: { announcementId, userId },
    })
    if (!existing) {
      await this.readRepository.save(this.readRepository.create({ announcementId, userId }))
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    const count = await this.announcementRepository
      .createQueryBuilder('a')
      .leftJoin('announcement_reads', 'r', 'r.announcement_id = a.id AND r.user_id = :userId', {
        userId,
      })
      .where('a.deleted = :deleted', { deleted: false })
      .andWhere('r.id IS NULL')
      .getCount()
    return count
  }
}
