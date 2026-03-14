import { Process, Processor, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiReport, ReportType } from '../entities/ai-report.entity'
import { AiFallbackService } from '../ai-fallback.service'
import { NotificationService } from '../../notification/notification.service'
import { NotificationType } from '../../notification/notification.types'

export interface ReportGenerateJobData {
  reportType: ReportType
  periodValue: string
  createdBy?: number
}

@Processor('report-generate')
export class ReportGenerateProcessor {
  private readonly logger = new Logger(ReportGenerateProcessor.name)

  constructor(
    @InjectRepository(AiReport)
    private readonly reportRepo: Repository<AiReport>,
    private readonly aiFallback: AiFallbackService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process()
  async handleGenerate(job: Job<ReportGenerateJobData>): Promise<void> {
    const { reportType, periodValue, createdBy } = job.data
    this.logger.log(`Generating ${reportType} report for ${periodValue}`)

    try {
      const result = await this.aiFallback.invokeWithFallback(
        'report_generate',
        `请生成${reportType === 'weekly' ? '周报' : '月报'}，期间: ${periodValue}。返回JSON: { "summary": "...", "highlights": ["..."], "metrics": {}, "recommendations": ["..."] }`,
        { maxTokens: 4096 },
      )

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(result.text)
      } catch {
        parsed = { summary: result.text, highlights: [], metrics: {}, recommendations: [] }
      }

      const report = this.reportRepo.create({
        reportType,
        periodValue,
        content: parsed,
        createdBy: createdBy ?? null,
      })
      await this.reportRepo.save(report)

      this.logger.log(`Report generated for ${periodValue}`)
    } catch (error) {
      this.logger.error(`Failed to generate report for ${periodValue}`, String(error))
      throw error
    }
  }

  @OnQueueFailed()
  async handleFailed(job: Job<ReportGenerateJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    this.logger.error(
      `报告生成任务失败 (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    )

    if (job.attemptsMade >= maxAttempts) {
      this.notificationService.notify({
        type: NotificationType.QUEUE_JOB_FAILED,
        actorId: 0,
        actorName: '系统',
        resource: 'report-generate',
        resourceId: job.data.createdBy ?? 0,
        message: `${job.data.reportType} 报告生成任务在 ${maxAttempts} 次重试后最终失败: ${error.message}`,
        data: { queue: 'report-generate', jobId: job.id, error: error.message },
      })
    }
  }
}
