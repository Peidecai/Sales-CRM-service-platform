import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { PaymentAnalyticsService } from './payment-analytics.service'
import { PaymentAnalyticsQueryDto } from './dto/payment-tracking.dto'

@ApiTags('回款分析')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('payment-analytics')
export class PaymentAnalyticsController {
  constructor(private readonly analyticsService: PaymentAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '回款仪表盘' })
  async getDashboard(@Query() query: PaymentAnalyticsQueryDto) {
    return this.analyticsService.getDashboard(query)
  }

  @Get('aging')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '账龄分析' })
  async getAging(@Query() query: PaymentAnalyticsQueryDto) {
    return this.analyticsService.getAgingAnalysis(query)
  }
}
