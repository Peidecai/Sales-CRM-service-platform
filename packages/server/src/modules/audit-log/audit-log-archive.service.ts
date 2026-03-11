import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from './audit-log.entity'

/** Sensitive fields to mask in audit log response_data / after / before */
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'phone',
  'mobile',
  'idCard',
  'idNumber',
  'bankCard',
  'bankAccount',
  'email',
  'secret',
  'privateKey',
  'creditCard',
])

@Injectable()
export class AuditLogArchiveService {
  private readonly logger = new Logger(AuditLogArchiveService.name)

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Mask sensitive fields in an object before writing to audit log.
   * Called by AuditLogInterceptor before persisting.
   */
  maskSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) return data
    if (typeof data !== 'object') return data

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item))
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.has(key) && typeof value === 'string') {
        result[key] = '***MASKED***'
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.maskSensitiveData(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  /**
   * Monthly archival: mark records > 3 months as 'warm', > 6 months as 'cold'.
   * Runs at 2:00 AM on the 1st of each month.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async archiveOldLogs(): Promise<void> {
    this.logger.log('Starting monthly audit log archival...')

    const now = new Date()

    // Mark > 6 months as cold
    const coldCutoff = new Date(now)
    coldCutoff.setMonth(coldCutoff.getMonth() - 6)
    const coldResult = await this.auditLogRepo
      .createQueryBuilder()
      .update(AuditLog)
      .set({ archiveStatus: 'cold' })
      .where('created_at < :cutoff', { cutoff: coldCutoff })
      .andWhere('archive_status != :status', { status: 'cold' })
      .execute()
    this.logger.log(`Marked ${coldResult.affected} records as cold`)

    // Mark > 3 months as warm
    const warmCutoff = new Date(now)
    warmCutoff.setMonth(warmCutoff.getMonth() - 3)
    const warmResult = await this.auditLogRepo
      .createQueryBuilder()
      .update(AuditLog)
      .set({ archiveStatus: 'warm' })
      .where('created_at < :cutoff AND created_at >= :coldCutoff', {
        cutoff: warmCutoff,
        coldCutoff,
      })
      .andWhere('archive_status = :status', { status: 'hot' })
      .execute()
    this.logger.log(`Marked ${warmResult.affected} records as warm`)

    // Delete records older than 1 year
    const deleteCutoff = new Date(now)
    deleteCutoff.setFullYear(deleteCutoff.getFullYear() - 1)
    const deleteResult = await this.auditLogRepo
      .createQueryBuilder()
      .delete()
      .from(AuditLog)
      .where('created_at < :cutoff', { cutoff: deleteCutoff })
      .execute()
    this.logger.log(`Deleted ${deleteResult.affected} records older than 1 year`)

    this.logger.log('Audit log archival completed')
  }
}
