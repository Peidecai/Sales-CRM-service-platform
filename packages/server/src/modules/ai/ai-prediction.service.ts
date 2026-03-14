import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Repository } from 'typeorm'
import { Queue } from 'bull'
import { IntentPrediction } from './entities/intent-prediction.entity'

@Injectable()
export class AiPredictionService {
  constructor(
    @InjectRepository(IntentPrediction)
    private readonly predictionRepo: Repository<IntentPrediction>,
    @InjectQueue('intent-prediction')
    private readonly predictionQueue: Queue,
  ) {}

  async getIntentPredictions(customerId?: string, opportunityId?: string) {
    const where: Record<string, unknown> = {}
    if (customerId) where['customerId'] = parseInt(customerId, 10)
    if (opportunityId) where['opportunityId'] = parseInt(opportunityId, 10)

    const list = await this.predictionRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 10,
    })

    return list
  }

  async generateIntentPrediction(customerId: string, opportunityId?: string) {
    const data: Record<string, unknown> = { customerId: parseInt(customerId, 10) }
    if (opportunityId) data['opportunityId'] = parseInt(opportunityId, 10)
    await this.predictionQueue.add(data)
    return { status: 'queued' }
  }
}
