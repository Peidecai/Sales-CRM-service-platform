import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { PostLoanService } from './post-loan.service'
import { CreatePostLoanDto } from './dto/create-post-loan.dto'
import { QueryPostLoanDto } from './dto/query-post-loan.dto'
import { ConfirmRepaymentDto } from './dto/confirm-repayment.dto'

@ApiTags('贷后管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('post-loans')
export class PostLoanController {
  constructor(private readonly postLoanService: PostLoanService) {}

  // ─── Static routes ────────────────────────────────────────────────────

  @Get('overdue')
  @ApiOperation({ summary: '获取逾期还款计划列表' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiResponse({ status: 200, description: '逾期还款计划列表' })
  getOverdue(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? parseInt(page, 10) || 1 : 1
    const ps = pageSize ? parseInt(pageSize, 10) || 20 : 20
    return this.postLoanService.getOverdueList(p, ps)
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取贷后统计数据' })
  @ApiResponse({ status: 200, description: '贷后统计' })
  getStatistics() {
    return this.postLoanService.getStatistics()
  }

  // ─── List & Create ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '获取贷后列表' })
  @ApiResponse({ status: 200, description: '分页贷后列表' })
  findAll(@Query() query: QueryPostLoanDto) {
    return this.postLoanService.findAll(query)
  }

  @Post()
  @ApiOperation({ summary: '创建贷后记录（自动生成还款计划）' })
  @ApiResponse({ status: 201, description: '贷后记录创建成功' })
  create(@Body() dto: CreatePostLoanDto, @CurrentUser('id') userId: number) {
    return this.postLoanService.create(
      dto.contractId,
      dto.loanAmount,
      dto.repaymentCount,
      dto.disbursedAt,
      userId,
    )
  }

  // ─── Parameterized routes ─────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '获取贷后详情' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '贷后详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postLoanService.findOne(id)
  }

  @Get(':id/repayment-plans')
  @ApiOperation({ summary: '获取还款计划列表' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '还款计划列表' })
  getRepaymentPlans(@Param('id', ParseIntPipe) id: number) {
    return this.postLoanService.getRepaymentPlans(id)
  }

  @Put(':id/credit-rating')
  @ApiOperation({ summary: '更新信用评级' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '信用评级更新成功' })
  updateCreditRating(
    @Param('id', ParseIntPipe) id: number,
    @Body('creditRating') creditRating: string,
  ) {
    return this.postLoanService.updateCreditRating(id, creditRating)
  }

  @Put('repayment-plans/:planId/confirm')
  @ApiOperation({ summary: '确认还款' })
  @ApiParam({ name: 'planId', type: Number })
  @ApiResponse({ status: 200, description: '还款确认成功' })
  confirmRepayment(
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: ConfirmRepaymentDto,
  ) {
    return this.postLoanService.confirmRepayment(planId, dto.paidAmount, dto.paidAt)
  }
}
