import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { PushService } from './push.service'
import { RegisterDeviceDto } from './dto/register-device.dto'
import { SendPushDto } from './dto/send-push.dto'

@ApiTags('push')
@Controller('push')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register')
  @ApiOperation({ summary: '注册设备 Token' })
  async register(@Body() dto: RegisterDeviceDto, @CurrentUser('id') userId: number) {
    const device = await this.pushService.registerDevice(userId, dto.deviceToken, dto.platform)
    return { code: 0, message: 'success', data: device }
  }

  @Post('unregister')
  @ApiOperation({ summary: '注销设备 Token' })
  async unregister(@Body() dto: RegisterDeviceDto, @CurrentUser('id') userId: number) {
    await this.pushService.unregisterDevice(userId, dto.deviceToken)
    return { code: 0, message: 'success', data: null }
  }

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '发送推送通知' })
  async send(@Body() dto: SendPushDto) {
    if (!dto.userId && !dto.role) {
      throw new BadRequestException('userId 或 role 必须提供其一')
    }

    const payload = { title: dto.title, body: dto.body, data: dto.data }

    if (dto.userId) {
      await this.pushService.sendToUser(dto.userId, payload)
    } else if (dto.role) {
      await this.pushService.sendToRole(dto.role, payload)
    }

    return { code: 0, message: 'success', data: null }
  }

  @Get('devices')
  @ApiOperation({ summary: '查询当前用户设备列表' })
  async getDevices(@CurrentUser('id') userId: number) {
    const devices = await this.pushService.getUserDevices(userId)
    return { code: 0, message: 'success', data: devices }
  }
}
