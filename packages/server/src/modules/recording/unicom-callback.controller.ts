import { Body, Controller, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { CloudTranscriptionCallbackService } from './cloud-transcription-callback.service'
import { UnicomCallCallbackService } from './unicom-call-callback.service'
import { UnicomCallbackQueryDto, UnicomCallbackResponse } from './dto/unicom-callback.dto'

@ApiTags('unicom-callback')
@Controller('unicom')
export class UnicomCallbackController {
  constructor(
    private readonly callCallbackService: UnicomCallCallbackService,
    private readonly transcriptionCallbackService: CloudTranscriptionCallbackService,
  ) {}

  @Post('records')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive account-level Unicom call detail and recording callbacks' })
  async handleAccountCallCallback(
    @Query() query: UnicomCallbackQueryDto,
    @Body() body: Record<string, unknown>,
  ): Promise<UnicomCallbackResponse> {
    return this.callCallbackService.handleCallback(undefined, query, body)
  }

  @Post(':phone/records')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Unicom call detail and recording callbacks by phone' })
  async handleCallCallback(
    @Param('phone') phone: string,
    @Query() query: UnicomCallbackQueryDto,
    @Body() body: Record<string, unknown>,
  ): Promise<UnicomCallbackResponse> {
    return this.callCallbackService.handleCallback(phone, query, body)
  }

  @Post('transcriptions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive account-level Unicom cloud transcription callbacks' })
  async handleAccountTranscriptionCallback(
    @Query() query: UnicomCallbackQueryDto,
    @Body() body: Record<string, unknown>,
    @Req() request: Request & { rawBody?: string },
  ): Promise<UnicomCallbackResponse> {
    return this.transcriptionCallbackService.handleCallback(
      query,
      body,
      undefined,
      'unicom',
      request.rawBody,
    )
  }

  @Post(':phone/transcriptions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Unicom cloud transcription callbacks by phone' })
  async handleTranscriptionCallback(
    @Param('phone') phone: string,
    @Query() query: UnicomCallbackQueryDto,
    @Body() body: Record<string, unknown>,
    @Req() request: Request & { rawBody?: string },
  ): Promise<UnicomCallbackResponse> {
    return this.transcriptionCallbackService.handleCallback(
      query,
      body,
      phone,
      'unicom',
      request.rawBody,
    )
  }
}
