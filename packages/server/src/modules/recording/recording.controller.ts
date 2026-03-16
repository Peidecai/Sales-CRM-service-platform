import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  ParseFloatPipe,
  DefaultValuePipe,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { RecordingService } from './recording.service'
import { UploadRecordingDto } from './dto/upload-recording.dto'
import { RecordingSourceType } from '@crm/shared'

/** Multer file shape — avoids depending on @types/multer */
interface UploadedFileShape {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  @ApiOperation({ summary: '上传录音文件（小程序语音速记）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '音频文件' },
        callRecordId: { type: 'integer', description: '关联通话记录 ID（可选）' },
        sourceType: {
          type: 'string',
          enum: ['platform', 'voice_memo'],
          description: '录音来源类型',
        },
      },
      required: ['file'],
    },
  })
  async upload(
    @UploadedFile() file: UploadedFileShape,
    @Body() dto: UploadRecordingDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件')
    }
    return this.recordingService.uploadRecording(
      file,
      dto.callRecordId,
      dto.sourceType ?? RecordingSourceType.VOICE_MEMO,
      user,
    )
  }
}
