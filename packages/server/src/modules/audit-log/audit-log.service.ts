import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog, AuditAction } from './audit-log.entity'

export interface AuditLogParams {
  userId: number
  username: string
  action: AuditAction
  resource: string
  resourceId?: number
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  ip?: string
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(params: AuditLogParams): Promise<void> {
    const entry = this.auditLogRepo.create({
      userId: params.userId,
      username: params.username,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? 0,
      before: params.before ?? null,
      after: params.after ?? null,
      ip: params.ip ?? '',
    })
    await this.auditLogRepo.save(entry)
  }

  async findAll(query: {
    page?: number
    pageSize?: number
    userId?: number
    resource?: string
    action?: AuditAction
  }) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (query.userId) {
      qb.andWhere('log.user_id = :userId', { userId: query.userId })
    }
    if (query.resource) {
      qb.andWhere('log.resource = :resource', { resource: query.resource })
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action })
    }

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }
}
