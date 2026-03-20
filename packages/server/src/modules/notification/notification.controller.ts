import { Controller, Get, Put, Body, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { NotificationSettingService } from './notification-setting.service'
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto'

@ApiTags('通知设置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('notification')
export class NotificationController {
  constructor(private readonly settingService: NotificationSettingService) {}

  @Get('settings')
  @ApiOperation({ summary: '获取通知偏好设置' })
  getSettings(@CurrentUser('id') userId: number) {
    return this.settingService.getSettings(userId)
  }

  @Put('settings')
  @ApiOperation({ summary: '更新通知偏好设置' })
  updateSettings(@CurrentUser('id') userId: number, @Body() dto: UpdateNotificationSettingDto) {
    return this.settingService.updateSettings(userId, dto)
  }
}
