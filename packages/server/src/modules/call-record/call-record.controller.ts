import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { NotificationService } from '../notification/notification.service'
import { CallRecordService } from './call-record.service'
import { LeaderReviewService } from './leader-review.service'
import { CreateCallRecordDto } from './dto/create-call-record.dto'
import { UpdateCallRecordDto } from './dto/update-call-record.dto'
import { QueryCallRecordDto } from './dto/query-call-record.dto'
import { CreateLeaderReviewDto } from './dto/create-leader-review.dto'

@ApiTags('通话记录')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('call-records')
export class CallRecordController {
  constructor(
    private readonly callRecordService: CallRecordService,
    private readonly notificationService: NotificationService,
    private readonly leaderReviewService: LeaderReviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get call record list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated call record list' })
  async findAll(@Query() query: QueryCallRecordDto, @CurrentUser() user: AuthUser) {
    return this.callRecordService.findAll(query, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new call record' })
  @ApiResponse({ status: 201, description: 'Call record created successfully' })
  async create(@Body() dto: CreateCallRecordDto, @CurrentUser() user: AuthUser) {
    const record = await this.callRecordService.create(dto)
    this.notificationService.callRecordCreated(user.id, user.username, record.id)
    return record
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export all call records as CSV' })
  @ApiResponse({ status: 200, description: 'Returns CSV file' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  async exportCsv(@Res() res: Response, @CurrentUser() user: AuthUser) {
    const csv = await this.callRecordService.exportCsv(user)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=call-records.csv')
    res.send(csv)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get call record statistics' })
  @ApiResponse({ status: 200, description: 'Returns call record statistics' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.callRecordService.getStats(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call record by ID' })
  @ApiParam({ name: 'id', description: 'Call record ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns call record detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only access own records' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.callRecordService.findOne(id, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update call record by ID' })
  @ApiParam({ name: 'id', description: 'Call record ID', type: Number })
  @ApiResponse({ status: 200, description: 'Call record updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only update own records' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCallRecordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.callRecordService.update(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete call record by ID' })
  @ApiParam({ name: 'id', description: 'Call record ID', type: Number })
  @ApiResponse({ status: 200, description: 'Call record deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.callRecordService.remove(id)
    this.notificationService.callRecordDeleted(user.id, user.username, id)
    return null
  }

  @Post(':id/summarize')
  @ApiOperation({ summary: 'Generate AI summary for a call record' })
  @ApiParam({ name: 'id', description: 'Call record ID', type: Number })
  @ApiResponse({ status: 200, description: 'Summary job submitted, returns jobId' })
  @ApiResponse({ status: 400, description: 'Call record has no notes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only summarize own records' })
  @ApiResponse({ status: 404, description: 'Call record not found' })
  summarize(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.callRecordService.summarize(id, user)
  }

  // ---- Leader Reviews ----

  @Get('customer/:customerId/reviews')
  @ApiOperation({ summary: '获取客户的领导点评列表' })
  @ApiParam({ name: 'customerId', description: '客户 ID' })
  async getCustomerReviews(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.leaderReviewService.findByCustomer(
      customerId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    )
    return { code: 0, message: 'success', data }
  }

  @Post(':id/reviews')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '为通话记录添加领导点评' })
  @ApiParam({ name: 'id', description: 'Call record ID' })
  async createReview(
    @Param('id', ParseIntPipe) callRecordId: number,
    @Body() body: CreateLeaderReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.leaderReviewService.create({
      callRecordId,
      customerId: body.customerId,
      reviewerId: user.id,
      content: body.content,
    })
    return { code: 0, message: 'success', data }
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: '获取通话记录的领导点评' })
  @ApiParam({ name: 'id', description: 'Call record ID' })
  async getReviews(@Param('id', ParseIntPipe) callRecordId: number) {
    const data = await this.leaderReviewService.findByCallRecord(callRecordId)
    return { code: 0, message: 'success', data }
  }
}
