import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  HttpCode,
  BadRequestException,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { ForecastPeriodType } from './entities/sales-forecast.entity'
import { AiAlertService } from './ai-alert.service'
import { AiReportService } from './ai-report.service'
import { AiForecastService } from './ai-forecast.service'
import { AiCompetitorService } from './ai-competitor.service'
import { AiProfileService } from './ai-profile.service'
import { AiPredictionService } from './ai-prediction.service'
import { ScriptRecommendService } from './script-recommend.service'
import { CostTrackerService } from './cost-tracker.service'

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class AiController {
  constructor(
    private readonly alertService: AiAlertService,
    private readonly reportService: AiReportService,
    private readonly forecastService: AiForecastService,
    private readonly competitorService: AiCompetitorService,
    private readonly profileService: AiProfileService,
    private readonly predictionService: AiPredictionService,
    private readonly scriptRecommendService: ScriptRecommendService,
    private readonly costTrackerService: CostTrackerService,
  ) {}

  // ---- Alerts (#124) ----
  @Get('alerts')
  async getAlerts(
    @Query('status') status?: string,
    @Query('alertType') alertType?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @CurrentUser() user?: AuthUser,
  ) {
    const pageNum = parseInt(page, 10) || 1
    const size = parseInt(pageSize, 10) || 20
    return this.alertService.getAlerts(status, alertType, pageNum, size, user)
  }

  @Put('alerts/:id/acknowledge')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async acknowledgeAlert(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    return this.alertService.acknowledgeAlert(id, user)
  }

  @Put('alerts/:id/resolve')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async resolveAlert(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    return this.alertService.resolveAlert(id, user)
  }

  // ---- Reports (#125) ----
  @Get('reports')
  async getReports(
    @Query('reportType') reportType?: string,
    @Query('periodValue') periodValue?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @CurrentUser() user?: AuthUser,
  ) {
    const pageNum = parseInt(page, 10) || 1
    const size = parseInt(pageSize, 10) || 20
    return this.reportService.getReports(reportType, periodValue, pageNum, size, user)
  }

  @Post('reports/generate')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  async generateReport(
    @Query('reportType') reportType: string,
    @Query('periodValue') periodValue: string,
    @CurrentUser('id') userId: number,
  ) {
    if (!reportType || !periodValue) {
      throw new BadRequestException('请指定reportType和periodValue')
    }
    return this.reportService.generateReport(reportType, periodValue, userId)
  }

  // ---- Sales Forecasts (#126) ----
  @Get('sales-forecasts')
  async getSalesForecasts(@Query('periodType') periodType?: ForecastPeriodType) {
    return this.forecastService.getSalesForecasts(periodType)
  }

  @Post('sales-forecasts/generate')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  async generateForecast(@Query('periodType') periodType: ForecastPeriodType) {
    if (!periodType) {
      throw new BadRequestException('请指定periodType')
    }
    return this.forecastService.generateSalesForecast(periodType)
  }

  // ---- Competitor Reports (#127) ----
  @Get('competitor-reports')
  async getCompetitorReports(
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @CurrentUser() user?: AuthUser,
  ) {
    const pageNum = parseInt(page, 10) || 1
    const size = parseInt(pageSize, 10) || 20
    return this.competitorService.getCompetitorReports(
      customerId,
      opportunityId,
      pageNum,
      size,
      user,
    )
  }

  @Get('competitor-reports/summary')
  async getCompetitorSummary(@CurrentUser() user?: AuthUser) {
    return this.competitorService.getCompetitorSummary(user)
  }

  // ---- Customer Profiles (#122) ----
  @Get('customer-profiles/:customerId')
  async getCustomerProfile(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.profileService.getCustomerProfile(customerId)
  }

  @Post('customer-profiles/:customerId/generate')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  async generateCustomerProfile(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.profileService.generateCustomerProfile(customerId)
  }

  // ---- Intent Predictions (#123) ----
  @Get('intent-predictions')
  async getIntentPredictions(
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.predictionService.getIntentPredictions(customerId, opportunityId)
  }

  @Post('intent-predictions/generate')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(200)
  async generateIntentPrediction(
    @Query('customerId') customerId: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('请指定customerId')
    }
    return this.predictionService.generateIntentPrediction(customerId, opportunityId)
  }

  // ---- Script Recommend (#128) ----
  @Get('script-recommend')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async getScriptRecommend(
    @Query('customerId') customerId: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('请指定customerId')
    }
    return this.scriptRecommendService.recommend(
      parseInt(customerId, 10),
      opportunityId ? parseInt(opportunityId, 10) : undefined,
    )
  }

  // ---- Cost usage ----
  @Get('usage')
  async getUsage() {
    return this.costTrackerService.getCurrentUsage()
  }
}
