import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AiReminderService } from './ai-reminder.service'
import { AiReminderQueryDto, AiReminderFeedbackDto } from './dto'
import { UserRole } from '@crm/shared'

interface RequestUser {
  id: number
  role: UserRole
}

@Controller('ai-reminders')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class AiReminderController {
  constructor(private readonly reminderService: AiReminderService) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: RequestUser) {
    return this.reminderService.getSummary(user.id)
  }

  @Get()
  async getReminders(@Query() query: AiReminderQueryDto, @CurrentUser() user: RequestUser) {
    return this.reminderService.getReminders(query, user)
  }

  @Put('read-all')
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.reminderService.markAllRead(user.id)
    return { message: 'All reminders marked as read' }
  }

  @Put(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.reminderService.markRead(id, user.id)
  }

  @Put(':id/feedback')
  async submitFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AiReminderFeedbackDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reminderService.submitFeedback(id, user.id, dto)
  }

  @Post('next-actions/:opportunityId')
  async generateNextActions(@Param('opportunityId', ParseIntPipe) opportunityId: number) {
    return this.reminderService.generateNextActions(opportunityId)
  }

  @Get('aggregate')
  async aggregate(@CurrentUser() user: RequestUser) {
    return this.reminderService.aggregateReminders(user.id)
  }
}
