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
import { CompetitorDetectionService } from './competitor-detection.service'
import { CompetitorMentionQueryDto } from './dto'

@Controller('competitor-mentions')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CompetitorMentionController {
  constructor(private readonly detectionService: CompetitorDetectionService) {}

  @Get('top')
  async getTopCompetitors(@Query('limit') limit?: string) {
    return this.detectionService.getTopCompetitors(limit ? Number(limit) : 10)
  }

  @Get()
  async getReport(@Query() query: CompetitorMentionQueryDto) {
    return this.detectionService.getCompetitorReport(query)
  }

  @Post('detect/:callRecordId')
  async detect(@Param('callRecordId', ParseIntPipe) callRecordId: number) {
    return this.detectionService.detectFromCallRecord(callRecordId)
  }
}
