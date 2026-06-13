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
  Res,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole, ServiceStatus } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { ServiceRecordService } from './service-record.service'
import { CreateServiceRecordDto } from './dto/create-service-record.dto'
import { UpdateServiceRecordDto } from './dto/update-service-record.dto'
import { QueryServiceRecordDto } from './dto/query-service-record.dto'
import { CloseServiceRecordDto } from './dto/close-service-record.dto'

@ApiTags('服务记录')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('service-records')
export class ServiceRecordController {
  constructor(private readonly service: ServiceRecordService) {}

  // ─── Static routes (MUST come before :id) ─────────────────────────────

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '导出服务记录CSV' })
  @ApiResponse({ status: 200, description: 'CSV 文件' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=service-records.csv')
    res.send('\uFEFF' + csv)
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '获取服务记录统计' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: '统计数据' })
  getStatistics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getStatistics({ startDate, endDate })
  }

  @Get('sla-alerts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '获取SLA预警列表' })
  @ApiResponse({ status: 200, description: 'SLA预警记录' })
  getSlaAlerts() {
    return this.service.getSlaAlerts()
  }

  // ─── List & Create ─────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '获取服务记录列表' })
  @ApiResponse({ status: 200, description: '分页服务记录列表' })
  findAll(@Query() query: QueryServiceRecordDto, @CurrentUser() user: AuthUser) {
    return this.service.findAll(query, user)
  }

  @Post()
  @ApiOperation({ summary: '创建服务记录' })
  @ApiResponse({ status: 201, description: '服务记录创建成功' })
  create(@Body() dto: CreateServiceRecordDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id)
  }

  // ─── Parameterized routes ──────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '获取服务记录详情' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '服务记录详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新服务记录' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceRecordDto) {
    return this.service.update(id, dto)
  }

  @Put(':id/status')
  @ApiOperation({ summary: '变更服务记录状态' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '状态变更成功' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ServiceStatus,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateStatus(id, status, user)
  }

  @Post(':id/close')
  @ApiOperation({ summary: '关闭服务记录（含满意度评价）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '服务记录已关闭' })
  @HttpCode(HttpStatus.OK)
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseServiceRecordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.close(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除服务记录（软删除）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '已删除' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id)
    return null
  }
}
