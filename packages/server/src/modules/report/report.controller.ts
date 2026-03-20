import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Param,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { ReportFilterDto } from './dto/report-filter.dto'
import { CallReportService } from './call-report.service'
import { PerformanceReportService } from './performance-report.service'
import { AiReportService } from './ai-report.service'
import { FunnelReportService } from './funnel-report.service'
import { ScreenService } from './screen.service'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ReportController {
  constructor(
    private readonly callReport: CallReportService,
    private readonly performanceReport: PerformanceReportService,
    private readonly aiReport: AiReportService,
    private readonly funnelReport: FunnelReportService,
    private readonly screenService: ScreenService,
  ) {}

  // ─── Call Reports ─────────────────────────────────────────────────────

  @Get('call/statistics')
  @ApiOperation({ summary: '通话统计' })
  getCallStatistics(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.callReport.getStatistics(filter, user)
  }

  @Get('call/daily')
  @ApiOperation({ summary: '每日分析' })
  getCallDailyAnalysis(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.callReport.getDailyAnalysis(filter, user)
  }

  @Get('call/personal/:userId')
  @ApiOperation({ summary: '个人通话分析' })
  getCallPersonalAnalysis(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.callReport.getPersonalAnalysis(userId, filter, user)
  }

  @Get('call/detail')
  @ApiOperation({ summary: '通话详细分析' })
  getCallDetailAnalysis(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.callReport.getDetailAnalysis(filter, user)
  }

  // ─── Performance Reports ──────────────────────────────────────────────

  @Get('performance/summary')
  @ApiOperation({ summary: '业绩汇总' })
  getPerformanceSummary(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.performanceReport.getSummary(filter, user)
  }

  @Get('performance/signing')
  @ApiOperation({ summary: '签约统计' })
  getPerformanceSigning(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.performanceReport.getSigningStats(filter, user)
  }

  @Get('performance/collection')
  @ApiOperation({ summary: '回款统计' })
  getPerformanceCollection(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.performanceReport.getCollectionStats(filter, user)
  }

  @Get('performance/overview')
  @ApiOperation({ summary: '业绩概览' })
  getPerformanceOverview(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.performanceReport.getOverview(filter, user)
  }

  @Get('performance/target')
  @ApiOperation({ summary: '目标完成度' })
  getPerformanceTarget(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.performanceReport.getTargetCompletion(filter, user)
  }

  // ─── AI Reports ───────────────────────────────────────────────────────

  @Get('ai/speech-skill')
  @ApiOperation({ summary: '话术分析' })
  getAiSpeechSkill(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.aiReport.getSpeechSkillAnalysis(filter, user)
  }

  @Get('ai/score-ranking')
  @ApiOperation({ summary: '评分排行' })
  getAiScoreRanking(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.aiReport.getScoreRanking(filter, user)
  }

  @Get('ai/employee-portrait/:userId')
  @ApiOperation({ summary: '员工画像' })
  getAiEmployeePortrait(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() filter: ReportFilterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiReport.getEmployeePortrait(userId, filter, user)
  }

  @Get('ai/tags')
  @ApiOperation({ summary: '标签统计' })
  getAiTagStatistics(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.aiReport.getTagStatistics(filter, user)
  }

  // ─── Funnel Reports ───────────────────────────────────────────────────

  @Get('funnel/sales')
  @ApiOperation({ summary: '销售漏斗' })
  getSalesFunnel(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.funnelReport.getSalesFunnel(filter, user)
  }

  @Get('funnel/stage-conversion')
  @ApiOperation({ summary: '阶段转化' })
  getStageConversion(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.funnelReport.getStageConversion(filter, user)
  }

  @Get('funnel/visits')
  @ApiOperation({ summary: '拜访统计' })
  getVisitStatistics(@Query() filter: ReportFilterDto, @CurrentUser() user: AuthUser) {
    return this.funnelReport.getVisitStatistics(filter, user)
  }

  // ─── Big Screens ──────────────────────────────────────────────────────

  @Get('screen/performance')
  @ApiOperation({ summary: '业绩大屏' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getPerformanceScreen() {
    return this.screenService.getPerformanceScreen()
  }

  @Get('screen/cockpit')
  @ApiOperation({ summary: '驾驶舱大屏' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getCockpitScreen() {
    return this.screenService.getCockpitScreen()
  }
}
