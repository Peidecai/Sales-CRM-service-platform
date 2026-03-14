import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Announcement, AnnouncementChannel } from './entities/announcement.entity'
import { AnnouncementRead } from './entities/announcement-read.entity'
import { AnnouncementPriority } from '@crm/shared'
import { NotificationService } from '../notification/notification.service'

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
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: {
    title: string
    content?: string
    priority?: AnnouncementPriority
    isPinned?: boolean
    channels?: AnnouncementChannel[]
    targetRoles?: string[]
    publishAt?: Date
    endAt?: Date
    createdBy?: number
  }): Promise<Announcement> {
    const entity = this.announcementRepository.create(dto)
    const saved = await this.announcementRepository.save(entity)

    // Broadcast WebSocket notification when WEB channel is included
    const channels = saved.channels ?? [AnnouncementChannel.WEB]
    if (channels.includes(AnnouncementChannel.WEB)) {
      this.notificationService.announcementPublished(saved.createdBy ?? 0, saved.id, saved.title)
    }

    return saved
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
    await this.announcementRepository.softRemove(ann)
  }

  async findAll(query: QueryAnnouncementDto): Promise<{ list: Announcement[]; total: number }> {
    const { priority, isPinned, page = 1, pageSize = 20 } = query
    const qb = this.announcementRepository.createQueryBuilder('a')
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
    const ann = await this.announcementRepository.findOne({ where: { id } })
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
      .andWhere('r.id IS NULL')
      .getCount()
    return count
  }
}
