import { Processor, Process } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { OpportunityScoringService } from './opportunity-scoring.service'

@Processor('ai-scoring')
export class AiScoringProcessor {
  private readonly logger = new Logger(AiScoringProcessor.name)

  constructor(private readonly scoringService: OpportunityScoringService) {}

  @Process('score')
  async handleScore(job: Job<{ opportunityId: number }>): Promise<void> {
    const { opportunityId } = job.data
    this.logger.log(`Scoring opportunity #${opportunityId}`)
    try {
      await this.scoringService.scoreOpportunity(opportunityId)
      this.logger.log(`Scored opportunity #${opportunityId} successfully`)
    } catch (err) {
      this.logger.error(`Failed to score opportunity #${opportunityId}`, err)
      throw err
    }
  }
}
