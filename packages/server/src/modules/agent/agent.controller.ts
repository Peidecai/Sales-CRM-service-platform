import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { AgentService } from './agent.service'
import { AgentStatusService, AgentStatus } from './agent-status.service'
import { CallDistributionService } from './call-distribution.service'
import { SetStatusDto } from './dto/set-status.dto'

@ApiTags('坐席')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('agents')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly agentStatus: AgentStatusService,
    private readonly callDistribution: CallDistributionService,
  ) {}

  @Get()
  @ApiOperation({ summary: '坐席列表（含当前状态）' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  async list(
    @Query('status') status?: string,
    @Query('teamId') _teamId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.agentService.list(user?.role ?? UserRole.SALES, user?.id ?? 0, status)
  }

  @Get('available')
  @ApiOperation({ summary: '当前 IDLE 坐席列表' })
  async available() {
    return this.agentService.available()
  }

  @Get(':id')
  @ApiOperation({ summary: '坐席详情' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.agentService.getOne(id)
  }

  @Post(':id/status')
  @ApiOperation({ summary: '状态变更' })
  @ApiParam({ name: 'id' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === UserRole.SALES && user.id !== id) {
      throw new BadRequestException('Can only change own status')
    }
    const toStatus = dto.status as AgentStatus
    await this.agentStatus.transition(id, toStatus)
    return { ok: true, status: toStatus }
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '今日通话数/总时长等' })
  @ApiParam({ name: 'id' })
  async getStats(@Param('id', ParseIntPipe) id: number) {
    return this.agentService.getStats(id)
  }

  @Post('assign-call')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '分配呼叫给坐席（指定坐席）' })
  async assignCall(@Body() body: { callId: string; agentId: number }) {
    const idle = await this.callDistribution.selectAgent([body.agentId], 'round_robin')
    if (!idle) throw new BadRequestException('Agent not available')
    await this.agentStatus.transition(body.agentId, AgentStatus.BUSY)
    return { ok: true, agentId: body.agentId }
  }

  @Post('auto-assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '自动分配呼叫（按策略选坐席）' })
  async autoAssign(
    @Body()
    body: {
      callId: string
      strategy?: 'round_robin' | 'least_calls' | 'skill_based'
      skillIds?: number[]
    },
  ) {
    const idleAgents = await this.agentService.available()
    const idleIds = idleAgents.map((a) => a.id)
    const strategy = body.strategy ?? 'round_robin'
    const agentId = await this.callDistribution.selectAgent(idleIds, strategy, {
      skillIds: body.skillIds,
    })
    if (!agentId) throw new BadRequestException('No available agent')
    await this.agentStatus.transition(agentId, AgentStatus.BUSY)
    return { ok: true, agentId, strategy }
  }

  @Get('status-logs')
  @ApiOperation({ summary: '状态变更日志' })
  @ApiQuery({ name: 'agentId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async statusLogs(
    @Query('agentId', ParseIntPipe) agentId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.agentService.statusLogs(agentId, startDate, endDate)
  }
}
