import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AiAlert } from './entities/ai-alert.entity'
import { AiReport } from './entities/ai-report.entity'
import { SalesForecast, ForecastPeriodType } from './entities/sales-forecast.entity'
import { CompetitorReport } from './entities/competitor-report.entity'
import { CustomerProfile } from './entities/customer-profile.entity'
import { IntentPrediction } from './entities/intent-prediction.entity'
import { ScriptRecommendService } from './script-recommend.service'
import { CostTrackerService } from './cost-tracker.service'

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(
    @InjectRepository(AiAlert)
    private readonly alertRepo: Repository<AiAlert>,
    @InjectRepository(AiReport)
    private readonly reportRepo: Repository<AiReport>,
    @InjectRepository(SalesForecast)
    private readonly forecastRepo: Repository<SalesForecast>,
    @InjectRepository(CompetitorReport)
    private readonly competitorRepo: Repository<CompetitorReport>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(IntentPrediction)
    private readonly predictionRepo: Repository<IntentPrediction>,
    @InjectQueue('customer-profile') private readonly profileQueue: Queue,
    @InjectQueue('intent-prediction') private readonly predictionQueue: Queue,
    @InjectQueue('anomaly-detect') private readonly anomalyQueue: Queue,
    @InjectQueue('report-generate') private readonly reportQueue: Queue,
    @InjectQueue('sales-forecast') private readonly forecastQueue: Queue,
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
  ) {
    const where: Record<string, unknown> = {}
    if (status) where['status'] = status
    if (alertType) where['alertType'] = alertType

    const pageNum = parseInt(page, 10) || 1
    const size = parseInt(pageSize, 10) || 20
    const [list, total] = await this.alertRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * size,
      take: size,
    })

    return { code: 0, message: 'success', data: { list, total, page: pageNum, pageSize: size } }
  }

  @Put('alerts/:id/acknowledge')
  async acknowledgeAlert(@Param('id', ParseIntPipe) id: number) {
    const alert = await this.alertRepo.findOne({ where: { id } })
    if (!alert) return { code: 40401, message: '告警不存在', data: null }

    alert.status = 'acknowledged'
    alert.acknowledgedAt = new Date()
    await this.alertRepo.save(alert)
    return { code: 0, message: 'success', data: alert }
  }

  @Put('alerts/:id/resolve')
  async resolveAlert(@Param('id', ParseIntPipe) id: number) {
    const alert = await this.alertRepo.findOne({ where: { id } })
    if (!alert) return { code: 40401, message: '告警不存在', data: null }

    alert.status = 'resolved'
    alert.resolvedAt = new Date()
    await this.alertRepo.save(alert)
    return { code: 0, message: 'success', data: alert }
  }

  // ---- Reports (#125) ----
  @Get('reports')
  async getReports(
    @Query('reportType') reportType?: string,
    @Query('periodValue') periodValue?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const where: Record<string, unknown> = {}
    if (reportType) where['reportType'] = reportType
    if (periodValue) where['periodValue'] = periodValue

    const pageNum = parseInt(page, 10) || 1
    const size = parseInt(pageSize, 10) || 20
    const [list, total] = await this.reportRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * size,
      take: size,
    })

    return { code: 0, message: 'success', data: { list, total, page: pageNum, pageSize: size } }
  }

  @Post('reports/generate')
  @HttpCode(200)
  async generateReport(
    @Query('reportType') reportType: string,
    @Query('periodValue') periodValue: string,
    @CurrentUser('id') userId: number,
  ) {
    if (!reportType || !periodValue) {
      return { code: 40001, message: '请指定reportType和periodValue', data: null }
    }

    await this.reportQueue.add({ reportType, periodValue, createdBy: userId })
    return { code: 0, message: '报告生成任务已提交', data: { status: 'queued' } }
  }

  // ---- Sales Forecasts (#126) ----
  @Get('sales-forecasts')
  async getSalesForecasts(@Query('periodType') periodType?: ForecastPeriodType) {
    const where: Record<string, unknown> = {}
    if (periodType) where['periodType'] = periodType

    const list = await this.forecastRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 10,
    })

    return { code: 0, message: 'success', data: list }
  }

  @Post('sales-forecasts/generate')
  @HttpCode(200)
  async generateForecast(@Query('periodType') periodType: ForecastPeriodType) {
    if (!periodType) {
      return { code: 40001, message: '请指定periodType', data: null }
    }

    await this.forecastQueue.add({ periodType })
    return { code: 0, message: '预测任务已提交', data: { status: 'queued' } }
  }

  // ---- Competitor Reports (#127) ----
  @Get('competitor-reports')
  async getCompetitorReports(
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const where: Record<string, unknown> = {}
    if (customerId) where['customerId'] = parseInt(customerId, 10)
    if (opportunityId) where['opportunityId'] = parseInt(opportunityId, 10)

    const pageNum = parseInt(page, 10) || 1
    const size = parseInt(pageSize, 10) || 20
    const [list, total] = await this.competitorRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * size,
      take: size,
    })

    return { code: 0, message: 'success', data: { list, total, page: pageNum, pageSize: size } }
  }

  @Get('competitor-reports/summary')
  async getCompetitorSummary() {
    const results = await this.competitorRepo
      .createQueryBuilder('cr')
      .select('cr.competitor_name', 'competitorName')
      .addSelect('COUNT(*)', 'mentionCount')
      .addSelect("SUM(CASE WHEN cr.win_lose = 'win' THEN 1 ELSE 0 END)", 'winCount')
      .addSelect("SUM(CASE WHEN cr.win_lose = 'lose' THEN 1 ELSE 0 END)", 'loseCount')
      .groupBy('cr.competitor_name')
      .orderBy('mentionCount', 'DESC')
      .getRawMany()

    return { code: 0, message: 'success', data: results }
  }

  // ---- Customer Profiles (#122) ----
  @Get('customer-profiles/:customerId')
  async getCustomerProfile(@Param('customerId', ParseIntPipe) customerId: number) {
    const profile = await this.profileRepo.findOne({ where: { customerId } })
    if (!profile) {
      return { code: 0, message: 'success', data: null }
    }
    return { code: 0, message: 'success', data: profile }
  }

  @Post('customer-profiles/:customerId/generate')
  @HttpCode(200)
  async generateCustomerProfile(@Param('customerId', ParseIntPipe) customerId: number) {
    await this.profileQueue.add({ customerId })
    return { code: 0, message: '画像生成任务已提交', data: { status: 'queued' } }
  }

  // ---- Intent Predictions (#123) ----
  @Get('intent-predictions')
  async getIntentPredictions(
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    const where: Record<string, unknown> = {}
    if (customerId) where['customerId'] = parseInt(customerId, 10)
    if (opportunityId) where['opportunityId'] = parseInt(opportunityId, 10)

    const list = await this.predictionRepo.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 10,
    })

    return { code: 0, message: 'success', data: list }
  }

  @Post('intent-predictions/generate')
  @HttpCode(200)
  async generateIntentPrediction(
    @Query('customerId') customerId: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    if (!customerId) {
      return { code: 40001, message: '请指定customerId', data: null }
    }
    const data: Record<string, unknown> = { customerId: parseInt(customerId, 10) }
    if (opportunityId) data['opportunityId'] = parseInt(opportunityId, 10)
    await this.predictionQueue.add(data)
    return { code: 0, message: '意向预测任务已提交', data: { status: 'queued' } }
  }

  // ---- Script Recommend (#128) ----
  @Get('script-recommend')
  async getScriptRecommend(
    @Query('customerId') customerId: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    if (!customerId) {
      return { code: 40001, message: '请指定customerId', data: null }
    }
    const result = await this.scriptRecommendService.recommend(
      parseInt(customerId, 10),
      opportunityId ? parseInt(opportunityId, 10) : undefined,
    )
    return { code: 0, message: 'success', data: result }
  }

  // ---- Cost usage ----
  @Get('usage')
  async getUsage() {
    const usage = await this.costTrackerService.getCurrentUsage()
    return { code: 0, message: 'success', data: usage }
  }
}
