import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { CloudTranscriptionCallbackService } from './cloud-transcription-callback.service'
import {
  CloudTranscriptionCallbackQueryDto,
  CloudTranscriptionCallbackResponse,
} from './dto/cloud-transcription-callback.dto'

@ApiTags('recording-transcription-callback')
@Controller('recordings/transcription')
export class CloudTranscriptionCallbackController {
  constructor(private readonly callbackService: CloudTranscriptionCallbackService) {}

  @Post('callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive cloud transcription callback' })
  async handleCallback(
    @Query() query: CloudTranscriptionCallbackQueryDto,
    @Body() body: Record<string, unknown>,
  ): Promise<CloudTranscriptionCallbackResponse> {
    return this.callbackService.handleCallback(query, body)
  }
}
