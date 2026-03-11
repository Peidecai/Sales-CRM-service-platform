import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../user/user.entity'
import { AgentStatusLog } from './entities/agent-status-log.entity'
import { AgentStatusService, AgentStatus } from './agent-status.service'
import { CallDistributionService } from './call-distribution.service'

@ApiTags('坐席')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AgentStatusLog)
    private readonly statusLogRepository: Repository<AgentStatusLog>,
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
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.deleted = :deleted', { deleted: false })
      .andWhere('u.isActive = :active', { active: true })
    if (user?.role === UserRole.SALES) {
      qb.andWhere('u.id = :uid', { uid: user.id })
    }
    const users = await qb.select(['u.id', 'u.name', 'u.username', 'u.role']).getMany()
    const withStatus = await Promise.all(
      users.map(async (u) => ({
        ...u,
        status: await this.agentStatus.getStatus(u.id),
      })),
    )
    if (status) {
      return withStatus.filter((a) => a.status === status)
    }
    return withStatus
  }

  @Get('available')
  @ApiOperation({ summary: '当前 IDLE 坐席列表' })
  async available() {
    const users = await this.userRepository.find({
      where: { deleted: false, isActive: true },
      select: ['id', 'name'],
    })
    const idle: typeof users = []
    for (const u of users) {
      const s = await this.agentStatus.getStatus(u.id)
      if (s === AgentStatus.IDLE) idle.push(u)
    }
    return idle
  }

  @Get(':id')
  @ApiOperation({ summary: '坐席详情' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userRepository.findOne({
      where: { id, deleted: false },
      select: ['id', 'name', 'username', 'role', 'phone'],
    })
    if (!user) throw new Error('Agent not found')
    const status = await this.agentStatus.getStatus(id)
    return { ...user, status }
  }

  @Post(':id/status')
  @ApiOperation({ summary: '状态变更' })
  @ApiParam({ name: 'id' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === UserRole.SALES && user.id !== id) {
      throw new Error('Can only change own status')
    }
    const toStatus = body.status as AgentStatus
    if (!Object.values(AgentStatus).includes(toStatus)) {
      throw new Error('Invalid status')
    }
    await this.agentStatus.transition(id, toStatus)
    return { ok: true, status: toStatus }
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '今日通话数/总时长等' })
  @ApiParam({ name: 'id' })
  async getStats(@Param('id', ParseIntPipe) id: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const logs = await this.statusLogRepository.count({
      where: { agentId: id, toStatus: AgentStatus.ON_CALL },
    })
    return {
      agentId: id,
      todayCallCount: logs,
      totalCallCount: logs,
    }
  }

  @Post('assign-call')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '分配呼叫给坐席' })
  async assignCall(@Body() body: { callId: string; agentId: number }) {
    const idle = await this.callDistribution.selectAgent([body.agentId], 'round_robin')
    if (!idle) throw new Error('Agent not available')
    await this.agentStatus.transition(body.agentId, AgentStatus.BUSY)
    return { ok: true, agentId: body.agentId }
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
    const qb = this.statusLogRepository
      .createQueryBuilder('l')
      .where('l.agentId = :agentId', { agentId })
      .orderBy('l.createdAt', 'DESC')
      .take(100)
    if (startDate) qb.andWhere('l.createdAt >= :startDate', { startDate: new Date(startDate) })
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      qb.andWhere('l.createdAt <= :endDate', { endDate: end })
    }
    return qb.getMany()
  }
}
