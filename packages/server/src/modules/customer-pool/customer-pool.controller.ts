import { Controller, Get, Post, Put, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common'
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

@Controller('api/v1/customer-pool')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomerPoolController {
  constructor(
    private readonly poolService: CustomerPoolService,
    private readonly configService: CustomerPoolConfigService,
  ) {}

  @Get()
  async getPoolList(@Query() query: QueryPoolDto) {
    const { list, total } = await this.poolService.getPoolList(query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Post('claim')
  async claim(@CurrentUser('id') userId: number, @Body() dto: ClaimDto) {
    return this.poolService.claim(userId, dto.customerId)
  }

  @Post('batch-claim')
  async batchClaim(@CurrentUser('id') userId: number, @Body() dto: BatchClaimDto) {
    return this.poolService.batchClaim(userId, dto.customerIds)
  }

  @Post('assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async assign(@CurrentUser() user: AuthUser, @Body() dto: AssignDto) {
    return this.poolService.assign(user.id, dto.customerId, dto.toUserId)
  }

  @Post('return')
  async returnToPool(@CurrentUser('id') userId: number, @Body() dto: ReturnDto) {
    await this.poolService.returnToPool(userId, dto.customerId, dto.reason)
    return null
  }

  @Post('batch-return')
  async batchReturn(@CurrentUser('id') userId: number, @Body() dto: BatchReturnDto) {
    return this.poolService.batchReturn(userId, dto.customerIds, dto.reason)
  }

  @Get('logs')
  async getPoolLogs(@Query() query: QueryPoolLogDto) {
    const { list, total } = await this.poolService.getPoolLogs(query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Get('config')
  @Roles(UserRole.ADMIN)
  async getConfig() {
    return this.configService.getConfig()
  }

  @Put('config')
  @Roles(UserRole.ADMIN)
  async updateConfig(@Body() dto: UpdatePoolConfigDto) {
    return this.configService.updateConfig(dto)
  }
}
