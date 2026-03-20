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
  DefaultValuePipe,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
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

  // ---- Static routes MUST come before :id ----

  @Get()
  @ApiOperation({ summary: '录音列表' })
  @ApiQuery({ name: 'callRecordId', required: false })
  @ApiQuery({ name: 'source', required: false, enum: RecordingSourceType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(
    @Query('callRecordId') callRecordId?: string,
    @Query('source') source?: RecordingSourceType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @CurrentUser() user?: AuthUser,
  ) {
    if (!user) throw new ForbiddenException('No permission to access this recording')
    const crId = callRecordId ? parseInt(callRecordId, 10) : undefined
    return this.recordingService.findRecordings(
      Number.isNaN(crId as number) ? undefined : crId,
      Number(page),
      Number(pageSize),
      user,
      source,
    )
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

  @Post('manual-upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (
        _req: unknown,
        file: { mimetype: string },
        cb: (err: Error | null, accept: boolean) => void,
      ) => {
        const allowed = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/mp4',
          'audio/amr',
          'audio/aac',
          'audio/ogg',
        ]
        if (allowed.includes(file.mimetype)) cb(null, true)
        else cb(new BadRequestException('不支持的音频格式，支持 mp3/wav/m4a/amr'), false)
      },
    }),
  )
  @ApiOperation({ summary: '手动上传录音文件（外部通话）' })
  @ApiConsumes('multipart/form-data')
  async manualUpload(
    @UploadedFile() file: UploadedFileShape,
    @Body() dto: UploadRecordingDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('未上传文件')
    return this.recordingService.uploadManualRecording(file, dto, user)
  }

  @Post('batch-upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (
        _req: unknown,
        file: { mimetype: string },
        cb: (err: Error | null, accept: boolean) => void,
      ) => {
        const allowed = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/mp4',
          'audio/amr',
          'audio/aac',
          'audio/ogg',
        ]
        if (allowed.includes(file.mimetype)) cb(null, true)
        else cb(new BadRequestException('不支持的音频格式'), false)
      },
    }),
  )
  @ApiOperation({ summary: '批量上传录音文件（最多 10 个）' })
  @ApiConsumes('multipart/form-data')
  async batchUpload(
    @UploadedFiles() files: UploadedFileShape[],
    @Body() dto: { items?: string },
    @CurrentUser() user: AuthUser,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('未上传文件')
    let dtos: UploadRecordingDto[] = []
    if (dto.items) {
      try {
        dtos = JSON.parse(dto.items)
      } catch {
        throw new BadRequestException('items JSON 格式无效')
      }
    }
    return this.recordingService.batchUploadManual(files, dtos, user)
  }

  // ---- Parameterized routes ----

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

  @Post(':id/reanalyze')
  @ApiOperation({ summary: '重新触发 AI 分析' })
  @ApiParam({ name: 'id' })
  async reanalyze(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recordingService.triggerAsr(id, user)
  }

  @Get(':id/transcript')
  @ApiOperation({ summary: '转写结果列表' })
  @ApiParam({ name: 'id' })
  async getTranscript(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.recordingService.getTranscripts(id, user)
  }
}
