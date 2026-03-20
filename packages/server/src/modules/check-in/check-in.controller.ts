import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CheckInService } from './check-in.service'
import { CreateCheckInDto } from './dto/create-check-in.dto'
import { QueryCheckInDto } from './dto/query-check-in.dto'

@ApiTags('check-in')
@Controller('check-in')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth()
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  @ApiOperation({ summary: '创建签到' })
  async create(@Body() dto: CreateCheckInDto, @CurrentUser('id') userId: number) {
    const checkIn = await this.checkInService.create(userId, dto)
    return { code: 0, message: 'success', data: checkIn }
  }

  @Get()
  @ApiOperation({ summary: '查询签到列表' })
  async findAll(
    @Query() query: QueryCheckInDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    // SALES users can only see their own check-ins
    if (role !== 'admin' && role !== 'manager') {
      query.userId = userId
    }
    const result = await this.checkInService.findAll(query)
    return { code: 0, message: 'success', data: result }
  }

  @Get('stats')
  @ApiOperation({ summary: '签到统计' })
  async getStats(@CurrentUser('id') userId: number) {
    const stats = await this.checkInService.getStats(userId)
    return { code: 0, message: 'success', data: stats }
  }

  @Get(':id')
  @ApiOperation({ summary: '签到详情' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: string,
  ) {
    const checkIn = await this.checkInService.findOne(id)
    // SALES users can only see their own check-ins
    if (role !== 'admin' && role !== 'manager' && checkIn.userId !== userId) {
      return { code: 40400, message: '签到记录不存在', data: null }
    }
    return { code: 0, message: 'success', data: checkIn }
  }

  @Put(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '审批通过签到' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    const checkIn = await this.checkInService.approve(id)
    return { code: 0, message: 'success', data: checkIn }
  }

  @Put(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '审批驳回签到' })
  async reject(@Param('id', ParseIntPipe) id: number) {
    const checkIn = await this.checkInService.reject(id)
    return { code: 0, message: 'success', data: checkIn }
  }
}
