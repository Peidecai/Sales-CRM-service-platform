import { Controller, Get, Post, Put, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CustomerPoolService } from './customer-pool.service'
import { CustomerPoolConfigService } from './customer-pool-config.service'
import {
  ClaimDto,
  BatchClaimDto,
  AssignDto,
  ReturnDto,
  BatchReturnDto,
  QueryPoolDto,
  QueryPoolLogDto,
  UpdatePoolConfigDto,
} from './dto'

@ApiTags('客户公海池')
@ApiBearerAuth()
@Controller('customer-pool')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomerPoolController {
  constructor(
    private readonly poolService: CustomerPoolService,
    private readonly configService: CustomerPoolConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: '公海池客户列表' })
  @ApiResponse({ status: 200, description: '分页公海池客户列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPoolList(@Query() query: QueryPoolDto) {
    const { list, total } = await this.poolService.getPoolList(query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Post('claim')
  @ApiOperation({ summary: '认领客户' })
  @ApiResponse({ status: 201, description: '认领成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: '认领失败（冷却期/持有上限）' })
  async claim(@CurrentUser('id') userId: number, @Body() dto: ClaimDto) {
    return this.poolService.claim(userId, dto.customerId)
  }

  @Post('batch-claim')
  @ApiOperation({ summary: '批量认领客户' })
  @ApiResponse({ status: 201, description: '批量认领成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async batchClaim(@CurrentUser('id') userId: number, @Body() dto: BatchClaimDto) {
    return this.poolService.batchClaim(userId, dto.customerIds)
  }

  @Post('assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '分配客户给指定销售' })
  @ApiResponse({ status: 201, description: '分配成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  async assign(@CurrentUser() user: AuthUser, @Body() dto: AssignDto) {
    return this.poolService.assign(user.id, dto.customerId, dto.toUserId)
  }

  @Post('return')
  @ApiOperation({ summary: '退回客户到公海池' })
  @ApiResponse({ status: 201, description: '退回成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async returnToPool(@CurrentUser('id') userId: number, @Body() dto: ReturnDto) {
    await this.poolService.returnToPool(userId, dto.customerId, dto.reason)
    return null
  }

  @Post('batch-return')
  @ApiOperation({ summary: '批量退回客户到公海池' })
  @ApiResponse({ status: 201, description: '批量退回成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async batchReturn(@CurrentUser('id') userId: number, @Body() dto: BatchReturnDto) {
    return this.poolService.batchReturn(userId, dto.customerIds, dto.reason)
  }

  @Get('logs')
  @ApiOperation({ summary: '公海池操作日志' })
  @ApiResponse({ status: 200, description: '分页操作日志列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPoolLogs(@Query() query: QueryPoolLogDto) {
    const { list, total } = await this.poolService.getPoolLogs(query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Get('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取公海池配置' })
  @ApiResponse({ status: 200, description: '公海池配置' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async getConfig() {
    return this.configService.getConfig()
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新公海池配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async updateConfig(@Body() dto: UpdatePoolConfigDto) {
    return this.configService.updateConfig(dto)
  }
}
