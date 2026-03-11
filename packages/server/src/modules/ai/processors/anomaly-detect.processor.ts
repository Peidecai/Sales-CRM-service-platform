import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiAlert } from '../entities/ai-alert.entity'
import { AiFallbackService } from '../ai-fallback.service'

export interface AnomalyDetectJobData {
  customerId?: number
  opportunityId?: number
  checkType?: 'churn_risk' | 'stalled_opportunity' | 'sentiment_drop' | 'all'
}

@Processor('anomaly-detect')
export class AnomalyDetectProcessor {
  private readonly logger = new Logger(AnomalyDetectProcessor.name)

  constructor(
    @InjectRepository(AiAlert)
    private readonly alertRepo: Repository<AiAlert>,
    private readonly aiFallback: AiFallbackService,
  ) {}

  @Process()
  async handleDetect(job: Job<AnomalyDetectJobData>): Promise<void> {
    const { customerId, opportunityId, checkType } = job.data
    this.logger.log(`Processing anomaly detection: type=${checkType ?? 'all'}`)

    try {
      const result = await this.aiFallback.invokeWithFallback(
        'anomaly_detect',
        `请检测以下数据的异常情况${customerId ? `（客户ID: ${customerId}）` : ''}${opportunityId ? `（商机ID: ${opportunityId}）` : ''}。类型: ${checkType ?? 'all'}。返回JSON: { "alerts": [{ "alertType": "churn_risk|stalled_opportunity|sentiment_drop", "title": "...", "detail": {} }] }`,
      )

      let parsed: {
        alerts?: Array<{ alertType: string; title: string; detail?: Record<string, unknown> }>
      }
      try {
        parsed = JSON.parse(result.text)
      } catch {
        parsed = { alerts: [] }
      }

      if (parsed.alerts && parsed.alerts.length > 0) {
        for (const alert of parsed.alerts) {
          const entity = this.alertRepo.create({
            customerId: customerId ?? null,
            opportunityId: opportunityId ?? null,
            alertType: alert.alertType,
            title: alert.title,
            detail: alert.detail ?? null,
            status: 'pending',
          })
          await this.alertRepo.save(entity)
        }
        this.logger.log(`Created ${parsed.alerts.length} alerts`)
      }
    } catch (error) {
      this.logger.error(`Anomaly detection failed`, String(error))
      throw error
    }
  }
}
