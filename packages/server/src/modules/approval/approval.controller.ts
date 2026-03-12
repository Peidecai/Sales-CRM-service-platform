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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { ApprovalService } from './approval.service'
import { CreateApprovalInstanceDto } from './dto/create-approval-instance.dto'
import { ApproveActionDto } from './dto/approve-action.dto'
import { QueryApprovalDto } from './dto/query-approval.dto'

@ApiTags('审批流程')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  // ─── Static routes (MUST come before :id) ─────────────────────────────

  @Get('pending')
  @ApiOperation({ summary: '获取我的待审批列表' })
  @ApiResponse({ status: 200, description: '待审批实例列表' })
  getMyPending(@CurrentUser() user: AuthUser) {
    return this.approvalService.getMyPending(user)
  }

  // ─── List & Create ─────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '获取审批列表（分页）' })
  @ApiResponse({ status: 200, description: '审批实例分页列表' })
  findAll(@Query() query: QueryApprovalDto, @CurrentUser() user: AuthUser) {
    return this.approvalService.findAll(query, user)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '发起审批申请' })
  @ApiResponse({ status: 201, description: '审批实例创建成功' })
  @ApiResponse({ status: 400, description: '业务类型无对应流程定义' })
  create(@Body() dto: CreateApprovalInstanceDto, @CurrentUser() user: AuthUser) {
    return this.approvalService.createInstance(dto, user)
  }

  // ─── Parameterized routes ──────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '获取审批详情（含操作记录）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '审批实例详情' })
  @ApiResponse({ status: 404, description: '审批实例不存在' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.approvalService.findOne(id, user)
  }

  @Put(':id/process')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: '处理审批（通过/驳回/转交）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '审批处理成功' })
  @ApiResponse({ status: 400, description: '当前状态不允许操作' })
  processAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.approvalService.processAction(id, dto, user)
  }

  @Put(':id/withdraw')
  @ApiOperation({ summary: '撤回审批申请' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '撤回成功' })
  @ApiResponse({ status: 400, description: '当前状态不允许撤回' })
  @ApiResponse({ status: 403, description: '无权撤回他人申请' })
  withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.approvalService.withdraw(id, user)
  }
}
