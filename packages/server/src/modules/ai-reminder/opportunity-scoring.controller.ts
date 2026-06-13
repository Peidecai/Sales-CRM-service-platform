import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { OpportunityScoringService } from './opportunity-scoring.service'
import { OpportunityScoreQueryDto } from './dto'

@Controller('opportunity-scores')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class OpportunityScoringController {
  constructor(private readonly scoringService: OpportunityScoringService) {}

  @Get('distribution')
  async getDistribution(@Query('userId') userId?: string) {
    return this.scoringService.getScoreDistribution(userId ? Number(userId) : undefined)
  }

  @Get('history')
  async getHistory(@Query() query: OpportunityScoreQueryDto) {
    return this.scoringService.getScoreHistory(query)
  }

  @Post(':opportunityId/score')
  async score(@Param('opportunityId', ParseIntPipe) opportunityId: number) {
    return this.scoringService.scoreOpportunity(opportunityId)
  }

  @Post(':opportunityId/enqueue')
  async enqueue(@Param('opportunityId', ParseIntPipe) opportunityId: number) {
    await this.scoringService.enqueueScoring(opportunityId)
    return { message: 'Scoring job enqueued' }
  }
}
