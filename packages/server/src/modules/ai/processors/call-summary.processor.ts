import { Process, Processor, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../../call-record/call-record.entity'
import { AiService } from '../ai.service'
import { CallAnalysisService } from '../call-analysis.service'
import { NotificationService } from '../../notification/notification.service'
import { NotificationType } from '../../notification/notification.types'
import { UserRole } from '@crm/shared'

export interface CallSummaryJobData {
  callRecordId: number
}

const SYSTEM_PROMPT = `你是一个专业的销售通话分析助手。请分析以下通话记录笔记，生成结构化摘要。

请按以下格式输出：
## 通话摘要
简述通话主要内容（1-2句话）

## 客户需求
- 列出客户提到的需求点

## 关键信息
- 列出通话中提到的关键信息（预算、时间线、决策人等）

## 跟进要点
- 列出需要后续跟进的事项

## 下一步行动
- 列出建议的下一步行动`

/** Build an AuthUser stub from the call record's owner for system-triggered analysis. */
function buildSystemUser(record: CallRecord): { id: number; username: string; role: UserRole } {
  return { id: record.userId, username: `user_${record.userId}`, role: UserRole.SALES }
}

@Processor('call-summary')
export class CallSummaryProcessor {
  private readonly logger = new Logger(CallSummaryProcessor.name)

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    private readonly aiService: AiService,
    private readonly callAnalysisService: CallAnalysisService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process()
  async handleSummary(job: Job<CallSummaryJobData>): Promise<void> {
    const { callRecordId } = job.data
    this.logger.log(`Processing call summary for record #${callRecordId}`)

    try {
      const record = await this.callRecordRepository.findOne({
        where: { id: callRecordId },
      })

      if (!record) {
        this.logger.warn(`Call record #${callRecordId} not found, skipping`)
        return
      }

      // Attempt full AI analysis first (richer result, updates ai_summary as a side-effect)
      try {
        await this.callAnalysisService.analyzeCall(callRecordId, buildSystemUser(record))
        this.logger.log(`Full call analysis completed for record #${callRecordId}`)
        return
      } catch (analysisError) {
        this.logger.warn(
          `Full analysis failed for record #${callRecordId}, falling back to legacy summary: ${String(analysisError)}`,
        )
      }

      // Legacy fallback: simple notes → plain-text summary
      if (!record.notes) {
        this.logger.warn(`Call record #${callRecordId} has no notes, skipping legacy fallback`)
        return
      }

      const summary = await this.aiService.chat(SYSTEM_PROMPT, record.notes, {
        temperature: 0.3,
        maxTokens: 1024,
      })

      record.aiSummary = summary
      await this.callRecordRepository.save(record)

      this.logger.log(`Legacy call summary generated for record #${callRecordId}`)
    } catch (error) {
      this.logger.error(`Failed to generate summary for record #${callRecordId}`, String(error))
      throw error // Let Bull retry
    }
  }

  @OnQueueFailed()
  async handleFailed(job: Job<CallSummaryJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    this.logger.error(
      `通话摘要任务失败 (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    )

    if (job.attemptsMade >= maxAttempts) {
      this.notificationService.notify({
        type: NotificationType.QUEUE_JOB_FAILED,
        actorId: 0,
        actorName: '系统',
        resource: 'call-summary',
        resourceId: job.data.callRecordId,
        message: `通话摘要任务 #${job.data.callRecordId} 在 ${maxAttempts} 次重试后最终失败: ${error.message}`,
        data: { queue: 'call-summary', jobId: job.id, error: error.message },
      })
    }
  }
}
