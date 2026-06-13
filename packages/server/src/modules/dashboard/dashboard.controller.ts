import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { DashboardService, DashboardStats } from './dashboard.service'

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({
    name: 'scope',
    enum: ['personal', 'team'],
    required: false,
    description: 'Data scope: personal (own data) or team (all data, Admin/Manager only)',
  })
  async getStats(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
    @Query('scope') scope?: 'personal' | 'team',
  ): Promise<{ code: number; message: string; data: DashboardStats }> {
    const effectiveScope = scope ?? 'personal'
    const data = await this.dashboardService.getStats(userId, role, effectiveScope)
    return { code: 0, message: 'success', data }
  }
}
