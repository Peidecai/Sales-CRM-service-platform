import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ServiceRecord } from './entities/service-record.entity'
import { CreateServiceRecordDto } from './dto/create-service-record.dto'
import { UpdateServiceRecordDto } from './dto/update-service-record.dto'
import { QueryServiceRecordDto } from './dto/query-service-record.dto'
import { CloseServiceRecordDto } from './dto/close-service-record.dto'
import { ServiceStatus, ServicePriority, UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

/** SLA deadlines in hours: [responseHours, resolveHours] */
const SLA_HOURS: Record<ServicePriority, [number, number]> = {
  [ServicePriority.URGENT]: [1, 4],
  [ServicePriority.HIGH]: [4, 24],
  [ServicePriority.MEDIUM]: [8, 72],
  [ServicePriority.LOW]: [24, 168],
}

@Injectable()
export class ServiceRecordService {
  constructor(
    @InjectRepository(ServiceRecord)
    private readonly repo: Repository<ServiceRecord>,
  ) {}

  async create(dto: CreateServiceRecordDto, userId: number): Promise<ServiceRecord> {
    const priority = dto.priority ?? ServicePriority.MEDIUM
    const [responseH, resolveH] = SLA_HOURS[priority]
    const now = new Date()
    const slaResponseDeadline = new Date(now.getTime() + responseH * 3600000)
    const slaResolveDeadline = new Date(now.getTime() + resolveH * 3600000)

    const record = this.repo.create({
      ...dto,
      priority,
      createdBy: userId,
      slaResponseDeadline,
      slaResolveDeadline,
    })
    return this.repo.save(record)
  }

  async findAll(
    query: QueryServiceRecordDto,
    user: AuthUser,
  ): Promise<{ list: ServiceRecord[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.repo.createQueryBuilder('sr').leftJoinAndSelect('sr.customer', 'customer')

    if (user.role === UserRole.SALES) {
      qb.andWhere('sr.createdBy = :uid OR sr.assigneeId = :uid', { uid: user.id })
    }

    if (query.status) {
      qb.andWhere('sr.status = :status', { status: query.status })
    }
    if (query.type) {
      qb.andWhere('sr.type = :type', { type: query.type })
    }
    if (query.priority) {
      qb.andWhere('sr.priority = :priority', { priority: query.priority })
    }
    if (query.customerId) {
      qb.andWhere('sr.customerId = :customerId', { customerId: query.customerId })
    }
    if (query.assigneeId) {
      qb.andWhere('sr.assigneeId = :assigneeId', { assigneeId: query.assigneeId })
    }
    if (query.keyword) {
      qb.andWhere('(sr.title LIKE :kw OR sr.description LIKE :kw)', { kw: `%${query.keyword}%` })
    }

    qb.orderBy('sr.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<ServiceRecord> {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['customer'],
    })
    if (!record) throw new NotFoundException('服务记录不存在')
    return record
  }

  async update(id: number, dto: UpdateServiceRecordDto): Promise<ServiceRecord> {
    const record = await this.findOne(id)
    Object.assign(record, dto)
    return this.repo.save(record)
  }

  async updateStatus(id: number, newStatus: ServiceStatus, user: AuthUser): Promise<ServiceRecord> {
    const record = await this.findOne(id)
    const validTransitions: Record<string, ServiceStatus[]> = {
      [ServiceStatus.PENDING]: [ServiceStatus.PROCESSING],
      [ServiceStatus.PROCESSING]: [ServiceStatus.RESOLVED],
      [ServiceStatus.RESOLVED]: [ServiceStatus.CLOSED, ServiceStatus.PROCESSING],
    }

    // Manager/Admin can force close from any state
    const isManagerOrAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER
    const allowed = validTransitions[record.status] ?? []

    if (!allowed.includes(newStatus) && !(isManagerOrAdmin && newStatus === ServiceStatus.CLOSED)) {
      throw new BadRequestException(`无法从 ${record.status} 转换到 ${newStatus}`)
    }

    record.status = newStatus
    const now = new Date()
    if (newStatus === ServiceStatus.PROCESSING && !record.respondedAt) {
      record.respondedAt = now
    }
    if (newStatus === ServiceStatus.RESOLVED) {
      record.resolvedAt = now
    }
    if (newStatus === ServiceStatus.CLOSED) {
      record.closedAt = now
    }

    return this.repo.save(record)
  }

  async close(id: number, dto: CloseServiceRecordDto, user: AuthUser): Promise<ServiceRecord> {
    const record = await this.findOne(id)
    const isManagerOrAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER

    if (record.status !== ServiceStatus.RESOLVED && !isManagerOrAdmin) {
      throw new BadRequestException('只有已解决的服务记录才能关闭')
    }

    record.status = ServiceStatus.CLOSED
    record.closedAt = new Date()
    record.satisfactionScore = dto.satisfactionScore
    record.satisfactionComment = dto.satisfactionComment ?? null
    if (dto.resolution) {
      record.resolution = dto.resolution
    }

    return this.repo.save(record)
  }

  async remove(id: number): Promise<void> {
    const record = await this.findOne(id)
    await this.repo.softRemove(record)
  }

  async exportCsv(): Promise<string> {
    const records = await this.repo.find({
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    })

    const headers = ['ID', '标题', '类型', '状态', '优先级', '客户', '满意度', '创建时间']
    const typeMap: Record<string, string> = {
      complaint: '投诉',
      consultation: '咨询',
      maintenance: '维护',
      return: '退货',
    }
    const statusMap: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      closed: '已关闭',
    }
    const priorityMap: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急',
    }

    const rows = records.map((r) =>
      [
        r.id,
        r.title,
        typeMap[r.type] ?? r.type,
        statusMap[r.status] ?? r.status,
        priorityMap[r.priority] ?? r.priority,
        r.customer?.name ?? '',
        r.satisfactionScore ?? '',
        r.createdAt.toISOString(),
      ].join(','),
    )

    return [headers.join(','), ...rows].join('\n')
  }

  async getStatistics(filter?: {
    startDate?: string
    endDate?: string
  }): Promise<Record<string, unknown>> {
    const qb = this.repo.createQueryBuilder('sr')

    if (filter?.startDate) {
      qb.andWhere('sr.createdAt >= :start', { start: filter.startDate })
    }
    if (filter?.endDate) {
      qb.andWhere('sr.createdAt <= :end', { end: filter.endDate })
    }

    const total = await qb.getCount()

    const byStatus = await this.repo
      .createQueryBuilder('sr')
      .select('sr.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('sr.status')
      .getRawMany()

    const byType = await this.repo
      .createQueryBuilder('sr')
      .select('sr.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('sr.type')
      .getRawMany()

    const avgSatisfaction = await this.repo
      .createQueryBuilder('sr')
      .select('AVG(sr.satisfactionScore)', 'avg')
      .where('sr.satisfactionScore IS NOT NULL')
      .getRawOne()

    // Average response time (hours) for records that have been responded to
    const avgResponseTime = await this.repo
      .createQueryBuilder('sr')
      .select('AVG(TIMESTAMPDIFF(SECOND, sr.created_at, sr.responded_at))', 'avgSeconds')
      .where('sr.responded_at IS NOT NULL')
      .getRawOne()

    // Average resolve time (hours)
    const avgResolveTime = await this.repo
      .createQueryBuilder('sr')
      .select('AVG(TIMESTAMPDIFF(SECOND, sr.created_at, sr.resolved_at))', 'avgSeconds')
      .where('sr.resolved_at IS NOT NULL')
      .getRawOne()

    // SLA compliance — response
    const totalWithResponseSla = await this.repo
      .createQueryBuilder('sr')
      .where('sr.slaResponseDeadline IS NOT NULL')
      .andWhere('sr.respondedAt IS NOT NULL')
      .getCount()
    const responseCompliant = await this.repo
      .createQueryBuilder('sr')
      .where('sr.slaResponseDeadline IS NOT NULL')
      .andWhere('sr.respondedAt IS NOT NULL')
      .andWhere('sr.respondedAt <= sr.slaResponseDeadline')
      .getCount()

    return {
      total,
      byStatus,
      byType,
      avgSatisfaction: avgSatisfaction?.avg ? parseFloat(avgSatisfaction.avg) : null,
      avgResponseTimeHours: avgResponseTime?.avgSeconds
        ? parseFloat(avgResponseTime.avgSeconds) / 3600
        : null,
      avgResolveTimeHours: avgResolveTime?.avgSeconds
        ? parseFloat(avgResolveTime.avgSeconds) / 3600
        : null,
      slaResponseComplianceRate:
        totalWithResponseSla > 0 ? responseCompliant / totalWithResponseSla : null,
    }
  }

  async getSlaAlerts(): Promise<ServiceRecord[]> {
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 3600000)

    return this.repo
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.customer', 'customer')
      .where('sr.status IN (:...statuses)', {
        statuses: [ServiceStatus.PENDING, ServiceStatus.PROCESSING],
      })
      .andWhere(
        '(sr.slaResponseDeadline <= :soon AND sr.respondedAt IS NULL) OR (sr.slaResolveDeadline <= :soon AND sr.resolvedAt IS NULL)',
        { soon: oneHourLater },
      )
      .orderBy('sr.slaResponseDeadline', 'ASC')
      .getMany()
  }

  async findByCustomer(
    customerId: number,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: ServiceRecord[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.repo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { list, total, page, pageSize }
  }
}
