import { Processor, Process, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
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

const CHUNK_SIZE = 100

@Processor('customer-import')
export class CustomerImportProcessor {
  private readonly logger = new Logger(CustomerImportProcessor.name)

  constructor(
    @InjectRepository(CustomerImportLog)
    private readonly logRepo: Repository<CustomerImportLog>,
    private readonly customerService: CustomerService,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
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

    // Split rows into chunks of CHUNK_SIZE
    const chunks: Array<Array<{ row: Record<string, string>; index: number }>> = []
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      chunks.push(rows.slice(i, i + CHUNK_SIZE).map((row, offset) => ({ row, index: i + offset })))
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]
      const queryRunner = this.dataSource.createQueryRunner()
      await queryRunner.connect()
      await queryRunner.startTransaction()

      try {
        for (const { row, index } of chunk) {
          try {
            const mapped = this.applyMapping(row, mapping)
            if (!mapped.name) {
              failDetails.push({ row: index + 2, reason: '客户名称不能为空' })
              continue
            }
            const createDto = { ...mapped, assignedUserId: userId } as Record<string, unknown>
            await this.customerService.create(
              createDto as unknown as Parameters<typeof this.customerService.create>[0],
              queryRunner.manager,
            )
            successCount++
          } catch (err: unknown) {
            failDetails.push({ row: index + 2, reason: (err as Error).message || '未知错误' })
          }
        }

        await queryRunner.commitTransaction()
      } catch (err: unknown) {
        await queryRunner.rollbackTransaction()
        // Mark entire chunk as failed
        for (const { index } of chunk) {
          if (!failDetails.some((f) => f.row === index + 2)) {
            failDetails.push({ row: index + 2, reason: `批次事务失败: ${(err as Error).message}` })
          }
        }
      } finally {
        await queryRunner.release()
      }

      // Report progress after each chunk
      const processed = Math.min((ci + 1) * CHUNK_SIZE, rows.length)
      const progress = Math.round((processed / rows.length) * 100)
      await job.progress(progress)

      this.notificationService.notifyUser(userId, {
        type: NotificationType.IMPORT_PROGRESS,
        actorId: 0,
        actorName: '系统',
        resource: 'customer_import',
        resourceId: logId,
        message: `导入进度：已处理 ${processed}/${rows.length} 行`,
        data: { logId, processed, total: rows.length, successCount },
      })
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

  @OnQueueFailed()
  async handleFailed(job: Job<ImportJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    this.logger.error(
      `导入任务 #${job.data.logId} 失败 (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    )

    if (job.attemptsMade >= maxAttempts) {
      this.notificationService.notify({
        type: NotificationType.QUEUE_JOB_FAILED,
        actorId: 0,
        actorName: '系统',
        resource: 'customer-import',
        resourceId: job.data.logId,
        message: `客户导入任务 #${job.data.logId} 在 ${maxAttempts} 次重试后最终失败: ${error.message}`,
        data: { queue: 'customer-import', jobId: job.id, error: error.message },
      })
    }
  }
}
