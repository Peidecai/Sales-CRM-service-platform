import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { SimService } from './sim.service'
import { UpdateSimPreferenceDto, SetCustomerSimBindingDto, SimUsageQueryDto } from './dto/sim.dto'

@ApiTags('双卡管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('sim')
export class SimController {
  constructor(private readonly simService: SimService) {}

  // Static routes first

  @Get('preference')
  @ApiOperation({ summary: '获取 SIM 配置' })
  async getPreference(@CurrentUser() user: AuthUser) {
    return this.simService.getPreference(user.id)
  }

  @Put('preference')
  @ApiOperation({ summary: '更新 SIM 配置' })
  async updatePreference(@Body() dto: UpdateSimPreferenceDto, @CurrentUser() user: AuthUser) {
    return this.simService.updatePreference(user.id, dto)
  }

  @Get('usage')
  @ApiOperation({ summary: 'SIM 用量统计' })
  async getUsage(@Query() query: SimUsageQueryDto, @CurrentUser() user: AuthUser) {
    return this.simService.getUsageStatistics(user.id, query)
  }

  @Get('resolve')
  @ApiOperation({ summary: '解析默认 SIM 卡' })
  async resolveDefault(@CurrentUser() user: AuthUser) {
    return this.simService.resolveSimSlot(user.id)
  }

  @Get('resolve/:customerId')
  @ApiOperation({ summary: '解析客户 SIM 卡' })
  async resolveForCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.simService.resolveSimSlot(user.id, customerId)
  }

  @Get('customer-binding/:customerId')
  @ApiOperation({ summary: '获取客户 SIM 绑定' })
  async getBinding(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.simService.getCustomerBinding(user.id, customerId)
  }

  @Post('customer-binding')
  @ApiOperation({ summary: '设置客户 SIM 绑定' })
  async setBinding(@Body() dto: SetCustomerSimBindingDto, @CurrentUser() user: AuthUser) {
    return this.simService.setCustomerBinding(user.id, dto)
  }

  @Delete('customer-binding/:customerId')
  @ApiOperation({ summary: '删除客户 SIM 绑定' })
  async removeBinding(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.simService.removeCustomerBinding(user.id, customerId)
  }
}
