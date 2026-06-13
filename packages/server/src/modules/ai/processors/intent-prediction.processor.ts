import { Process, Processor, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { IntentPrediction } from '../entities/intent-prediction.entity'
import { AiFallbackService } from '../ai-fallback.service'
import { NotificationService } from '../../notification/notification.service'
import { NotificationType } from '../../notification/notification.types'

export interface IntentPredictionJobData {
  customerId: number
  opportunityId?: number
}

@Processor('intent-prediction')
export class IntentPredictionProcessor {
  private readonly logger = new Logger(IntentPredictionProcessor.name)

  constructor(
    @InjectRepository(IntentPrediction)
    private readonly predictionRepo: Repository<IntentPrediction>,
    private readonly aiFallback: AiFallbackService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process()
  async handlePrediction(job: Job<IntentPredictionJobData>): Promise<void> {
    const { customerId, opportunityId } = job.data
    this.logger.log(`Processing intent prediction for customer #${customerId}`)

    try {
      const result = await this.aiFallback.invokeWithFallback(
        'intent_prediction',
        `请预测客户ID ${customerId}${opportunityId ? `，商机ID ${opportunityId}` : ''} 的购买意向。返回JSON：{ "purchaseProbability": 0-100, "predictedCloseDate": "YYYY-MM-DD"|null, "positiveSignals": ["..."], "negativeSignals": ["..."] }`,
      )

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(result.text)
      } catch {
        parsed = {
          purchaseProbability: 50,
          predictedCloseDate: null,
          positiveSignals: [],
          negativeSignals: [],
        }
      }

      // Upsert
      const where: Record<string, unknown> = { customerId }
      if (opportunityId) where['opportunityId'] = opportunityId

      const existing = await this.predictionRepo.findOne({ where })
      if (existing) {
        existing.purchaseProbability =
          (parsed.purchaseProbability as number) ?? existing.purchaseProbability
        existing.predictedCloseDate =
          (parsed.predictedCloseDate as string) ?? existing.predictedCloseDate
        existing.positiveSignals = (parsed.positiveSignals as string[]) ?? existing.positiveSignals
        existing.negativeSignals = (parsed.negativeSignals as string[]) ?? existing.negativeSignals
        await this.predictionRepo.save(existing)
      } else {
        const prediction = this.predictionRepo.create({
          customerId,
          opportunityId: opportunityId ?? null,
          purchaseProbability: (parsed.purchaseProbability as number) ?? 0,
          predictedCloseDate: (parsed.predictedCloseDate as string) ?? null,
          positiveSignals: (parsed.positiveSignals as string[]) ?? null,
          negativeSignals: (parsed.negativeSignals as string[]) ?? null,
        })
        await this.predictionRepo.save(prediction)
      }

      this.logger.log(`Intent prediction generated for customer #${customerId}`)
    } catch (error) {
      this.logger.error(`Failed to predict intent for customer #${customerId}`, String(error))
      throw error
    }
  }

  @OnQueueFailed()
  async handleFailed(job: Job<IntentPredictionJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    this.logger.error(
      `意向预测任务失败 (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    )

    if (job.attemptsMade >= maxAttempts) {
      this.notificationService.notify({
        type: NotificationType.QUEUE_JOB_FAILED,
        actorId: 0,
        actorName: '系统',
        resource: 'intent-prediction',
        resourceId: job.data.customerId,
        message: `客户 #${job.data.customerId} 意向预测任务在 ${maxAttempts} 次重试后最终失败: ${error.message}`,
        data: { queue: 'intent-prediction', jobId: job.id, error: error.message },
      })
    }
  }
}
