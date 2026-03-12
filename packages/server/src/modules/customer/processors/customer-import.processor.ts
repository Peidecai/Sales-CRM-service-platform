import { Processor, Process } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerImportLog, ImportStatus } from '../entities/customer-import-log.entity'
import { CustomerService } from '../customer.service'
import { NotificationService } from '../../notification/notification.service'
import { NotificationType } from '../../notification/notification.types'

interface ImportJobData {
  logId: number
  rows: Array<Record<string, string>>
  userId: number
  mapping: Record<string, string>
}

@Processor('customer-import')
export class CustomerImportProcessor {
  private readonly logger = new Logger(CustomerImportProcessor.name)

  constructor(
    @InjectRepository(CustomerImportLog)
    private readonly logRepo: Repository<CustomerImportLog>,
    private readonly customerService: CustomerService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process()
  async handleImport(job: Job<ImportJobData>): Promise<void> {
    const { logId, rows, userId, mapping } = job.data
    this.logger.log(`开始处理导入任务 #${logId}，共 ${rows.length} 行`)

    const log = await this.logRepo.findOneOrFail({ where: { id: logId } })
    log.status = ImportStatus.PROCESSING
    await this.logRepo.save(log)

    let successCount = 0
    const failDetails: Array<{ row: number; reason: string }> = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const mapped = this.applyMapping(rows[i], mapping)
        if (!mapped.name) {
          failDetails.push({ row: i + 2, reason: '客户名称不能为空' })
          continue
        }
        const createDto = { ...mapped, assignedUserId: userId } as Record<string, unknown>
        await this.customerService.create(
          createDto as unknown as Parameters<typeof this.customerService.create>[0],
        )
        successCount++
      } catch (err: unknown) {
        failDetails.push({ row: i + 2, reason: (err as Error).message || '未知错误' })
      }

      // Push progress every 10 rows
      if ((i + 1) % 10 === 0 || i === rows.length - 1) {
        this.notificationService.notifyUser(userId, {
          type: NotificationType.IMPORT_PROGRESS,
          actorId: 0,
          actorName: '系统',
          resource: 'customer_import',
          resourceId: logId,
          message: `导入进度：已处理 ${i + 1}/${rows.length} 行`,
          data: { logId, processed: i + 1, total: rows.length, successCount },
        })
      }
    }

    // Update import log
    log.successCount = successCount
    log.failCount = failDetails.length
    log.failDetails = failDetails.length > 0 ? failDetails : null
    log.status = ImportStatus.COMPLETED
    await this.logRepo.save(log)

    // Final notification
    this.notificationService.notifyUser(userId, {
      type: NotificationType.IMPORT_COMPLETED,
      actorId: 0,
      actorName: '系统',
      resource: 'customer_import',
      resourceId: logId,
      message: `客户导入完成：成功 ${successCount} 条，失败 ${failDetails.length} 条`,
      data: { logId, successCount, failCount: failDetails.length },
    })

    this.logger.log(`导入任务 #${logId} 完成：成功 ${successCount}，失败 ${failDetails.length}`)
  }

  private applyMapping(
    row: Record<string, string>,
    mapping: Record<string, string>,
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [excelCol, systemField] of Object.entries(mapping)) {
      if (systemField && row[excelCol] !== undefined) {
        result[systemField] = row[excelCol]
      }
    }
    return result
  }
}
