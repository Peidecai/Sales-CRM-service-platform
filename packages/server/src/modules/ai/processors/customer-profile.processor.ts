import { Process, Processor, OnQueueFailed } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CustomerProfile } from '../entities/customer-profile.entity'
import { AiFallbackService } from '../ai-fallback.service'
import { NotificationService } from '../../notification/notification.service'
import { NotificationType } from '../../notification/notification.types'

export interface CustomerProfileJobData {
  customerId: number
}

@Processor('customer-profile')
export class CustomerProfileProcessor {
  private readonly logger = new Logger(CustomerProfileProcessor.name)

  constructor(
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    private readonly aiFallback: AiFallbackService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process()
  async handleProfile(job: Job<CustomerProfileJobData>): Promise<void> {
    const { customerId } = job.data
    this.logger.log(`Processing customer profile for #${customerId}`)

    try {
      const result = await this.aiFallback.invokeWithFallback(
        'customer_profile',
        `请分析客户ID ${customerId} 的画像。请返回JSON格式：{ "discType": "D|I|S|C", "discScores": { "D": 0-100, "I": 0-100, "S": 0-100, "C": 0-100 }, "communicationStyle": "...", "painPoints": ["..."], "healthScore": 0-100 }`,
      )

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(result.text)
      } catch {
        parsed = {
          discType: 'S',
          discScores: { D: 25, I: 25, S: 25, C: 25 },
          communicationStyle: result.text,
          painPoints: [],
          healthScore: 50,
        }
      }

      // Upsert customer profile
      const existing = await this.profileRepo.findOne({ where: { customerId } })
      if (existing) {
        existing.discType = (parsed.discType as string) ?? existing.discType
        existing.discScores =
          (parsed.discScores as CustomerProfile['discScores']) ?? existing.discScores
        existing.communicationStyle =
          (parsed.communicationStyle as string) ?? existing.communicationStyle
        existing.painPoints = (parsed.painPoints as string[]) ?? existing.painPoints
        existing.healthScore = (parsed.healthScore as number) ?? existing.healthScore
        existing.rawAnalysis = parsed
        await this.profileRepo.save(existing)
      } else {
        const profile = this.profileRepo.create({
          customerId,
          discType: (parsed.discType as string) ?? null,
          discScores: (parsed.discScores as CustomerProfile['discScores']) ?? null,
          communicationStyle: (parsed.communicationStyle as string) ?? null,
          painPoints: (parsed.painPoints as string[]) ?? null,
          healthScore: (parsed.healthScore as number) ?? null,
          rawAnalysis: parsed,
        })
        await this.profileRepo.save(profile)
      }

      this.logger.log(`Customer profile generated for #${customerId}`)
    } catch (error) {
      this.logger.error(`Failed to generate profile for customer #${customerId}`, String(error))
      throw error
    }
  }

  @OnQueueFailed()
  async handleFailed(job: Job<CustomerProfileJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    this.logger.error(
      `客户画像任务失败 (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      error.stack,
    )

    if (job.attemptsMade >= maxAttempts) {
      this.notificationService.notify({
        type: NotificationType.QUEUE_JOB_FAILED,
        actorId: 0,
        actorName: '系统',
        resource: 'customer-profile',
        resourceId: job.data.customerId,
        message: `客户 #${job.data.customerId} 画像生成任务在 ${maxAttempts} 次重试后最终失败: ${error.message}`,
        data: { queue: 'customer-profile', jobId: job.id, error: error.message },
      })
    }
  }
}
