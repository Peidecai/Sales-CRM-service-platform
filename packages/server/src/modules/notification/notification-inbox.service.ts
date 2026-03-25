import { Injectable, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification } from './entities/notification.entity'

@Injectable()
export class NotificationInboxService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /**
   * Paginated inbox list for the current user.
   * Includes both direct notifications (userId=currentUser) and broadcasts (userId=0).
   */
  async findAll(
    userId: number,
    query: { page?: number; pageSize?: number; isRead?: boolean; type?: string },
  ) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.repo
      .createQueryBuilder('n')
      .where('(n.userId = :userId OR n.userId = 0)', { userId })
      .orderBy('n.createdAt', 'DESC')

    if (query.isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead: query.isRead })
    }
    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type })
    }

    qb.skip((page - 1) * pageSize).take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  /**
   * Mark a single notification as read. Must belong to current user or be broadcast.
   */
  async markAsRead(id: number, userId: number): Promise<void> {
    const notification = await this.repo.findOneBy({ id })
    if (!notification) {
      return
    }
    if (notification.userId !== userId && notification.userId !== 0) {
      throw new ForbiddenException('无权操作此通知')
    }
    await this.repo.update(id, { isRead: true })
  }

  /**
   * Mark all notifications for the current user as read.
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('(userId = :userId OR userId = 0)', { userId })
      .andWhere('isRead = false')
      .execute()
  }

  /**
   * Get total unread count for the current user.
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.repo
      .createQueryBuilder('n')
      .where('(n.userId = :userId OR n.userId = 0)', { userId })
      .andWhere('n.isRead = false')
      .getCount()
  }

  /**
   * Get unread count grouped by category.
   */
  async getUnreadCountByType(userId: number) {
    const rows: Array<{ type: string; cnt: string }> = await this.repo
      .createQueryBuilder('n')
      .select('n.type', 'type')
      .addSelect('COUNT(*)', 'cnt')
      .where('(n.userId = :userId OR n.userId = 0)', { userId })
      .andWhere('n.isRead = false')
      .groupBy('n.type')
      .getRawMany()

    const counts: Record<string, number> = {}
    for (const r of rows) {
      counts[r.type] = parseInt(r.cnt, 10)
    }

    const sum = (prefixes: string[]) =>
      Object.entries(counts)
        .filter(([k]) => prefixes.some((p) => k.startsWith(p)))
        .reduce((acc, [, v]) => acc + v, 0)

    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    return {
      total,
      system: sum(['article:', 'import:', 'queue:', 'announcement:']),
      task: sum(['follow_up:']),
      follow_up: sum(['follow_up:']),
      opportunity: sum(['opportunity:']),
      customer: sum(['customer:']),
      call_record: sum(['call_record:']),
    }
  }

  /**
   * Persist a notification record.
   */
  async create(data: {
    userId: number
    type: string
    title: string
    content: string
    relatedId?: number | null
    relatedType?: string | null
  }): Promise<Notification> {
    const entity = this.repo.create({
      ...data,
      isRead: false,
    })
    return this.repo.save(entity)
  }
}
