import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { FollowUpService } from './follow-up.service'
import { FollowUpAiReminderService } from './follow-up-ai-reminder.service'
import { CreateFollowUpDto } from './dto/create-follow-up.dto'
import { QueryFollowUpDto } from './dto/query-follow-up.dto'
import { UpdateReminderSettingDto } from './dto/update-reminder-setting.dto'

@ApiTags('跟进记录')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('follow-ups')
export class FollowUpController {
  constructor(
    private readonly followUpService: FollowUpService,
    private readonly aiReminderService: FollowUpAiReminderService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建跟进记录' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateFollowUpDto, @CurrentUser() user: AuthUser) {
    return this.followUpService.create(dto, user)
  }

  @Get()
  @ApiOperation({ summary: '查询跟进记录列表（传 customerId 查某客户，不传则查全部）' })
  @ApiResponse({ status: 200, description: '返回分页跟进记录列表' })
  async findAll(@Query() query: QueryFollowUpDto, @CurrentUser() user: AuthUser) {
    const { list, total } = query.customerId
      ? await this.followUpService.findByCustomer(query.customerId, query, user)
      : await this.followUpService.findAll(query, user)

    return {
      list,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  @Get('reminder-settings')
  @ApiOperation({ summary: '获取提醒设置' })
  @ApiResponse({ status: 200, description: '返回当前用户的提醒设置' })
  async getReminderSettings(@CurrentUser() user: AuthUser) {
    return this.aiReminderService.getReminderSettings(user.id)
  }

  @Put('reminder-settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新提醒设置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateReminderSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateReminderSettingDto,
  ) {
    return this.aiReminderService.updateReminderSettings(user.id, dto)
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新跟进记录（仅创建者和 ADMIN/MANAGER）' })
  @ApiParam({ name: 'id', description: 'FollowUp ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '无权限' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateFollowUpDto>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.followUpService.update(id, dto, user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '软删除跟进记录（仅创建者和 ADMIN/MANAGER）' })
  @ApiParam({ name: 'id', description: 'FollowUp ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权限' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.followUpService.remove(id, user)
    return null
  }
}
