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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
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
  @ApiOperation({ summary: '获取逾期回款列表' })
  @ApiResponse({ status: 200, description: '逾期回款列表（计划日期已过但未确认的回款）' })
  getOverdue() {
    return this.paymentService.getOverduePayments()
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新回款记录' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '回款记录更新成功' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentDto) {
    return this.paymentService.update(id, dto)
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
