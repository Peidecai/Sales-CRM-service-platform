import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  ParseFloatPipe,
  DefaultValuePipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { RecordingService } from './recording.service'

@ApiTags('录音')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('recordings')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Get()
  @ApiOperation({ summary: '录音列表' })
  @ApiQuery({ name: 'callRecordId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(
    @Query('callRecordId') callRecordId?: string,
    @Query('page', new DefaultValuePipe(1), ParseFloatPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseFloatPipe) pageSize = 20,
    @CurrentUser() user?: AuthUser,
  ) {
    if (!user) throw new ForbiddenException('No permission to access this recording')
    const crId = callRecordId ? parseInt(callRecordId, 10) : undefined
    return this.recordingService.findRecordings(
      Number.isNaN(crId as number) ? undefined : crId,
      Number(page),
      Number(pageSize),
      user,
    )
  }

  @Get(':id')
  @ApiOperation({ summary: '单条录音元数据' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recordingService.getRecording(id, user)
  }

  @Get(':id/play-url')
  @ApiOperation({ summary: '临时播放 URL' })
  @ApiParam({ name: 'id' })
  async getPlayUrl(
    @Param('id', ParseIntPipe) id: number,
    @Query('expires') expires?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    if (!user) throw new NotFoundException('Recording not found')
    const file = await this.recordingService.getRecording(id, user)
    const expiresSec = expires ? parseInt(expires, 10) : 3600
    const url = this.recordingService.getPlayUrl(file.ossKey, expiresSec)
    return { url, expiresIn: expiresSec }
  }

  @Post(':id/trigger-asr')
  @ApiOperation({ summary: '触发 ASR 转写' })
  @ApiParam({ name: 'id' })
  async triggerAsr(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recordingService.triggerAsr(id, user)
  }

  @Get(':id/transcript')
  @ApiOperation({ summary: '转写结果列表' })
  @ApiParam({ name: 'id' })
  async getTranscript(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recordingService.getTranscripts(id, user)
  }
}
