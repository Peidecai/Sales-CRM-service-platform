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
import { CallRecordService } from './call-record.service'
import { CreateCallRecordDto } from './dto/create-call-record.dto'
import { UpdateCallRecordDto } from './dto/update-call-record.dto'
import { QueryCallRecordDto } from './dto/query-call-record.dto'

@ApiTags('通话记录')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('call-records')
export class CallRecordController {
  constructor(private readonly callRecordService: CallRecordService) {}

  @Get()
  @ApiOperation({ summary: 'Get call record list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated call record list' })
  async findAll(@Query() query: QueryCallRecordDto, @CurrentUser() user: AuthUser) {
    return this.callRecordService.findAll(query, user)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new call record' })
  @ApiResponse({ status: 201, description: 'Call record created successfully' })
  create(@Body() dto: CreateCallRecordDto) {
    return this.callRecordService.create(dto)
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
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.callRecordService.remove(id)
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
}
