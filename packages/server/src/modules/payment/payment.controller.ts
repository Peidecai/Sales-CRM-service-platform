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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { PaymentService } from './payment.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { UpdatePaymentDto } from './dto/update-payment.dto'
import { QueryPaymentDto } from './dto/query-payment.dto'
import { ConfirmPaymentDto } from './dto/confirm-payment.dto'

@ApiTags('回款管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Static routes (MUST come before :id) ─────────────────────────────

  @Get('overdue')
  @ApiOperation({ summary: '获取逾期回款列表（分页）' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiResponse({ status: 200, description: '逾期回款列表' })
  getOverdue(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? parseInt(page, 10) || 1 : 1
    const ps = pageSize ? parseInt(pageSize, 10) || 20 : 20
    return this.paymentService.getOverdueList(p, ps)
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取回款统计数据' })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'ownerId', type: Number, required: false })
  @ApiQuery({ name: 'customerId', type: Number, required: false })
  @ApiResponse({ status: 200, description: '回款统计' })
  getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('ownerId') ownerId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.paymentService.getStatistics({
      startDate,
      endDate,
      ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
    })
  }

  // ─── List & Create ─────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '获取回款列表' })
  @ApiResponse({ status: 200, description: '分页回款列表' })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentService.findAll(query)
  }

  @Post()
  @ApiOperation({ summary: '创建回款记录' })
  @ApiResponse({ status: 201, description: '回款记录创建成功' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.paymentService.create(dto, user)
  }

  // ─── Parameterized routes ──────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '获取回款详情' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '回款详情' })
  @ApiResponse({ status: 404, description: '回款记录不存在' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.paymentService.findOne(id, user)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新回款记录' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '回款记录更新成功' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentService.update(id, dto, user)
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: '确认到账' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '回款已确认到账，状态更新为 confirmed' })
  @ApiResponse({ status: 404, description: '回款记录不存在' })
  confirmPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentService.confirmPayment(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除回款记录（软删除，仅管理员/经理）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '回款记录已删除' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.paymentService.remove(id)
    return null
  }
}
