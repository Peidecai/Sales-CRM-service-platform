import { Controller, Get, Put, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { NotificationInboxService } from './notification-inbox.service'

@ApiTags('通知收件箱')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationInboxController {
  constructor(private readonly inboxService: NotificationInboxService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表（分页）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  async findAll(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const data = await this.inboxService.findAll(userId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      type: type || undefined,
    })
    return { code: 0, message: 'success', data }
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@CurrentUser('id') userId: number) {
    const count = await this.inboxService.getUnreadCount(userId)
    return { code: 0, message: 'success', data: { count } }
  }

  @Get('unread-count-by-type')
  @ApiOperation({ summary: '按类型获取未读通知数量' })
  async getUnreadCountByType(@CurrentUser('id') userId: number) {
    const data = await this.inboxService.getUnreadCountByType(userId)
    return { code: 0, message: 'success', data }
  }

  @Put('read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  async markAllAsRead(@CurrentUser('id') userId: number) {
    await this.inboxService.markAllAsRead(userId)
    return { code: 0, message: 'success', data: null }
  }

  @Put(':id/read')
  @ApiOperation({ summary: '标记单条通知为已读' })
  async markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    await this.inboxService.markAsRead(id, userId)
    return { code: 0, message: 'success', data: null }
  }
}
