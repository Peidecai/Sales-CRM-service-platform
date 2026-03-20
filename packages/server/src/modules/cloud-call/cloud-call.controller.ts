import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '../user/user.entity'
import { CloudCallService } from './cloud-call.service'
import { InitiateCallDto } from './dto/initiate-call.dto'
import { CloudCallCallbackDto } from './dto/cloud-call-callback.dto'
import { UpdateCloudCallSettingsDto } from './dto/update-cloud-call-settings.dto'

@ApiTags('cloud-call')
@Controller('cloud-call')
@UseInterceptors(AuditLogInterceptor)
export class CloudCallController {
  constructor(private readonly cloudCallService: CloudCallService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发起云呼' })
  async initiateCall(@Body() dto: InitiateCallDto, @CurrentUser('id') userId: number) {
    const record = await this.cloudCallService.initiateCall(dto, userId)
    return { code: 0, message: 'success', data: record }
  }

  @Post('callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook 回调（签名验证，无 JWT）' })
  async callback(@Body() dto: CloudCallCallbackDto) {
    await this.cloudCallService.handleCallback(dto)
    return { code: 0, message: 'success' }
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询通话状态' })
  async getCallStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    const result = await this.cloudCallService.getCallStatus(id, userId, role)
    return { code: 0, message: 'success', data: result }
  }

  @Get(':id/recording')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取录音 URL（签名URL，15分钟时效）' })
  async getRecordingUrl(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    const url = await this.cloudCallService.getRecordingUrl(id, userId, role)
    return { code: 0, message: 'success', data: { url } }
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取云呼配置（Admin only）' })
  async getSettings() {
    const settings = await this.cloudCallService.getSettings()
    return { code: 0, message: 'success', data: settings }
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新云呼配置（Admin only）' })
  async updateSettings(@Body() settings: UpdateCloudCallSettingsDto) {
    const result = await this.cloudCallService.updateSettings(settings)
    return { code: 0, message: 'success', data: result }
  }
}
