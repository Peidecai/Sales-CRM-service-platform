import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole, TargetMetricType, TargetPeriod } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { SalesTargetService } from './sales-target.service'
import { CreateSalesTargetDto } from './dto/create-sales-target.dto'
import { UpdateSalesTargetDto } from './dto/update-sales-target.dto'
import { QuerySalesTargetDto } from './dto/query-sales-target.dto'
import { DecomposeTargetDto } from './dto/decompose-target.dto'

@ApiTags('销售目标')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('sales-targets')
export class SalesTargetController {
  constructor(private readonly salesTargetService: SalesTargetService) {}

  // ─── List & Create ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '获取销售目标列表' })
  @ApiResponse({ status: 200, description: '分页目标列表' })
  findAll(@Query() query: QuerySalesTargetDto, @CurrentUser() user: AuthUser) {
    return this.salesTargetService.findAll(query, user)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建销售目标' })
  @ApiResponse({ status: 201, description: '目标创建成功' })
  create(@Body() dto: CreateSalesTargetDto) {
    return this.salesTargetService.create(dto)
  }

  // ─── Static routes (MUST come before :id) ─────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: '获取公司级目标总览' })
  @ApiQuery({ name: 'year', type: Number, required: false })
  @ApiResponse({ status: 200, description: '公司各指标目标与达成汇总' })
  getOverview(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear()
    return this.salesTargetService.getCompanyOverview(y)
  }

  @Get('ranking/sales')
  @ApiOperation({ summary: '销售排行榜' })
  @ApiQuery({ name: 'metricType', enum: TargetMetricType })
  @ApiQuery({ name: 'period', enum: TargetPeriod })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'quarter', type: Number, required: false })
  @ApiQuery({ name: 'month', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getSalesRanking(
    @Query('metricType') metricType: TargetMetricType,
    @Query('period') period: TargetPeriod,
    @Query('year') year: string,
    @Query('quarter') quarter?: string,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear()
    return this.salesTargetService.getSalesRanking(
      metricType,
      period,
      y,
      quarter ? parseInt(quarter, 10) || undefined : undefined,
      month ? parseInt(month, 10) || undefined : undefined,
      limit ? parseInt(limit, 10) || 10 : 10,
    )
  }

  @Get('ranking/team')
  @ApiOperation({ summary: '团队排行榜' })
  @ApiQuery({ name: 'metricType', enum: TargetMetricType })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'quarter', type: Number, required: false })
  getTeamRanking(
    @Query('metricType') metricType: TargetMetricType,
    @Query('year') year: string,
    @Query('quarter') quarter?: string,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear()
    return this.salesTargetService.getTeamRanking(
      metricType,
      y,
      quarter ? parseInt(quarter, 10) || undefined : undefined,
    )
  }

  @Get('ranking/trend')
  @ApiOperation({ summary: '排名趋势' })
  @ApiQuery({ name: 'userId', type: Number })
  @ApiQuery({ name: 'metricType', enum: TargetMetricType })
  @ApiQuery({ name: 'year', type: Number })
  getRankingTrend(
    @Query('userId') userId: string,
    @Query('metricType') metricType: TargetMetricType,
    @Query('year') year: string,
  ) {
    const uid = parseInt(userId, 10)
    const y = parseInt(year, 10) || new Date().getFullYear()
    if (!uid || isNaN(uid)) {
      return []
    }
    return this.salesTargetService.getRankingTrend(uid, metricType, y)
  }

  // ─── Parameterized routes ─────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '获取目标详情' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '目标详情' })
  @ApiResponse({ status: 404, description: '目标不存在' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.salesTargetService.findOne(id, user)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新销售目标' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '目标更新成功' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSalesTargetDto) {
    return this.salesTargetService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除销售目标' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '目标已删除' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.salesTargetService.remove(id)
    return null
  }

  @Post(':id/decompose')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '分解目标到团队/个人' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: '目标分解成功' })
  decompose(@Param('id', ParseIntPipe) id: number, @Body() dto: DecomposeTargetDto) {
    return this.salesTargetService.decompose(id, dto)
  }

  @Get(':id/achievement')
  @ApiOperation({ summary: '获取目标达成情况' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '达成率、剩余值、每日所需' })
  getAchievement(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.salesTargetService.getAchievement(id, user)
  }

  @Get(':id/forecast')
  @ApiOperation({ summary: '获取目标预测' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '预测完成值和完成率' })
  getForecast(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.salesTargetService.getForecast(id, user)
  }
}
