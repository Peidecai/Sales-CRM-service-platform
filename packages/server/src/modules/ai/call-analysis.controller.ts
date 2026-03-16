import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CallAnalysisService } from './call-analysis.service'
import { AiAnalysisConfigService } from './ai-analysis-config.service'
import { UpdateAnalysisConfigDto } from './dto/update-analysis-config.dto'
import { ManualNoteDto } from './dto/manual-note.dto'
import { QueryAnalysisDto } from './dto/query-analysis.dto'

@ApiTags('AI通话分析')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CallAnalysisController {
  constructor(
    private readonly callAnalysisService: CallAnalysisService,
    private readonly configService: AiAnalysisConfigService,
  ) {}

  // ---- Config (Admin only) ----

  @Get('analysis-config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取AI分析配置' })
  async getConfig() {
    const data = await this.configService.getConfig()
    return { code: 0, message: 'success', data }
  }

  @Put('analysis-config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新AI分析配置' })
  async updateConfig(@Body() dto: UpdateAnalysisConfigDto, @CurrentUser() user: AuthUser) {
    const data = await this.configService.updateConfig(dto, user.id)
    return { code: 0, message: 'success', data }
  }

  @Get('analysis-config/default-prompts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取默认提示词（供管理员参考）' })
  async getDefaultPrompts() {
    const data = this.configService.getDefaultPrompts()
    return { code: 0, message: 'success', data }
  }

  // ---- Analysis Operations ----

  @Post('call-analysis/:callRecordId')
  @ApiOperation({ summary: '触发通话AI分析（同步，返回分析结果）' })
  @ApiParam({ name: 'callRecordId', description: '通话记录 ID' })
  async triggerAnalysis(
    @Param('callRecordId', ParseIntPipe) callRecordId: number,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.callAnalysisService.analyzeCall(callRecordId, user)
    return { code: 0, message: 'success', data }
  }

  @Get('call-analysis')
  @ApiOperation({ summary: '分析记录列表（支持多维过滤 + 分页）' })
  async getAnalysisList(@Query() query: QueryAnalysisDto, @CurrentUser() user: AuthUser) {
    const data = await this.callAnalysisService.getAnalysisList(query, user)
    return { code: 0, message: 'success', data }
  }

  @Get('call-analysis/:callRecordId')
  @ApiOperation({ summary: '获取指定通话的最新已完成分析结果' })
  @ApiParam({ name: 'callRecordId', description: '通话记录 ID' })
  async getAnalysisResult(
    @Param('callRecordId', ParseIntPipe) callRecordId: number,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.callAnalysisService.getAnalysisResult(callRecordId, user)
    return { code: 0, message: 'success', data }
  }

  @Put('call-analysis/:resultId/note')
  @ApiOperation({ summary: '为分析结果添加 / 更新手动备注' })
  @ApiParam({ name: 'resultId', description: '分析结果 ID' })
  async addManualNote(
    @Param('resultId', ParseIntPipe) resultId: number,
    @Body() dto: ManualNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.callAnalysisService.addManualNote(resultId, dto, user)
    return { code: 0, message: 'success', data }
  }

  @Post('call-analysis/:resultId/apply')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '手动采纳分析结果（标记 applied）' })
  @ApiParam({ name: 'resultId', description: '分析结果 ID' })
  async applyResult(
    @Param('resultId', ParseIntPipe) resultId: number,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.callAnalysisService.applyAnalysisResult(resultId, user)
    return { code: 0, message: 'success', data }
  }
}
