import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { NegotiationAnalysisService } from './negotiation-analysis.service'
import { CreateNegotiationAnalysisDto } from './dto/create-negotiation-analysis.dto'
import { QueryNegotiationAnalysisDto } from './dto/query-negotiation-analysis.dto'
import { NegotiationDashboardQueryDto } from './dto/negotiation-dashboard-query.dto'

@ApiTags('negotiation-analysis')
@Controller('negotiation-analysis')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class NegotiationAnalysisController {
  constructor(private readonly service: NegotiationAnalysisService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '谈判分析仪表盘' })
  getDashboard(@Query() query: NegotiationDashboardQueryDto) {
    return this.service.getDashboard(query)
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '导出谈判分析 CSV' })
  async exportCsv(@Query() query: NegotiationDashboardQueryDto, @Res() res: Response) {
    const csv = await this.service.exportCsv(query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=negotiation-analysis.csv')
    res.send('\uFEFF' + csv)
  }

  @Get('patterns')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '谈判胜负模式分析' })
  getPatterns(@Query() query: NegotiationDashboardQueryDto) {
    return this.service.getPatterns(query)
  }

  @Get()
  @ApiOperation({ summary: '谈判分析列表' })
  findAll(@Query() query: QueryNegotiationAnalysisDto) {
    return this.service.findAll(query)
  }

  @Post()
  @ApiOperation({ summary: '触发谈判分析' })
  triggerAnalysis(@Body() dto: CreateNegotiationAnalysisDto, @CurrentUser() user: { id: number }) {
    return this.service.triggerAnalysis(dto.callRecordId, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: '谈判分析详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '删除谈判分析' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }

  @Post(':id/re-negotiate')
  @ApiOperation({ summary: '生成再谈判建议' })
  generateReNegotiationAdvice(@Param('id', ParseIntPipe) id: number) {
    return this.service.generateReNegotiationAdvice(id)
  }
}
