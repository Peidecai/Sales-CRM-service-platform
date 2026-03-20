import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { PaymentPlanService } from './payment-plan.service'
import { CreatePaymentPlanDto, ConfirmPaymentDto } from './dto/payment-tracking.dto'

@ApiTags('回款计划')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('payment-plans')
export class PaymentPlanController {
  constructor(private readonly planService: PaymentPlanService) {}

  @Get('overdue')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '逾期行项列表' })
  async getOverdue(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.planService.getOverdueItems(page, pageSize)
  }

  @Get()
  @ApiOperation({ summary: '回款计划列表' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.planService.findAll(page, pageSize, user)
  }

  @Post()
  @ApiOperation({ summary: '创建回款计划' })
  async create(@Body() dto: CreatePaymentPlanDto, @CurrentUser() user: AuthUser) {
    return this.planService.create(dto, user)
  }

  @Get(':id')
  @ApiOperation({ summary: '回款计划详情' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.planService.findOne(id, user)
  }

  @Post('items/:id/confirm')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '确认收款' })
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.planService.confirmPayment(id, dto, user)
  }

  @Post('items/:id/bad-debt')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '标记坏账' })
  async markBadDebt(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.planService.markBadDebt(id, user)
  }
}
