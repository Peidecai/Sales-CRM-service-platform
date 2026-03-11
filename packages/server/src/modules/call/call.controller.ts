import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { CallService } from './call.service'
import { DialDto } from './dto/dial.dto'
import { CallRecordsQueryDto } from './dto/call-records-query.dto'

@ApiTags('呼叫控制')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('call')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Post('dial')
  @ApiOperation({ summary: '发起外呼' })
  async dial(@Body() dto: DialDto, @CurrentUser() user: AuthUser) {
    return this.callService.dial(
      {
        calleeNumber: dto.calleeNumber,
        callerNumber: dto.callerNumber,
        customerId: dto.customerId,
        opportunityId: dto.opportunityId,
      },
      user,
    )
  }

  @Post(':callId/answer')
  @ApiOperation({ summary: '接听' })
  @ApiParam({ name: 'callId' })
  async answer(@Param('callId') callId: string, @CurrentUser() user: AuthUser) {
    await this.callService.answer(callId, user)
    return { ok: true }
  }

  @Post(':callId/hangup')
  @ApiOperation({ summary: '挂断' })
  @ApiParam({ name: 'callId' })
  async hangup(
    @Param('callId') callId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    await this.callService.hangup(callId, body?.reason, user)
    return { ok: true }
  }

  @Post(':callId/mute')
  @ApiOperation({ summary: '静音' })
  @ApiParam({ name: 'callId' })
  async mute(@Param('callId') callId: string, @CurrentUser() user: AuthUser) {
    await this.callService.mute(callId, user)
    return { ok: true }
  }

  @Post(':callId/unmute')
  @ApiOperation({ summary: '取消静音' })
  @ApiParam({ name: 'callId' })
  async unmute(@Param('callId') callId: string, @CurrentUser() user: AuthUser) {
    await this.callService.unmute(callId, user)
    return { ok: true }
  }

  @Post(':callId/hold')
  @ApiOperation({ summary: '保持' })
  @ApiParam({ name: 'callId' })
  async hold(@Param('callId') callId: string, @CurrentUser() user: AuthUser) {
    await this.callService.hold(callId, user)
    return { ok: true }
  }

  @Post(':callId/resume')
  @ApiOperation({ summary: '恢复' })
  @ApiParam({ name: 'callId' })
  async resume(@Param('callId') callId: string, @CurrentUser() user: AuthUser) {
    await this.callService.resume(callId, user)
    return { ok: true }
  }

  @Post(':callId/transfer')
  @ApiOperation({ summary: '转接' })
  @ApiParam({ name: 'callId' })
  async transfer(
    @Param('callId') callId: string,
    @Body() body: { targetNumber: string },
    @CurrentUser() user: AuthUser,
  ) {
    await this.callService.transfer(callId, body.targetNumber, user)
    return { ok: true }
  }

  @Get('records')
  @ApiOperation({ summary: '当前用户通话记录列表' })
  async getRecords(@Query() query: CallRecordsQueryDto, @CurrentUser() user: AuthUser) {
    return this.callService.getRecords(query, user)
  }

  @Get('stats/overview')
  @ApiOperation({ summary: '呼叫统计概览' })
  async getStatsOverview(@CurrentUser() user: AuthUser) {
    return this.callService.getStatsOverview(user)
  }

  @Get('records/:id')
  @ApiOperation({ summary: '单条通话详情' })
  @ApiParam({ name: 'id' })
  async getRecordDetail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.callService.getRecordDetail(id, user)
  }
}
