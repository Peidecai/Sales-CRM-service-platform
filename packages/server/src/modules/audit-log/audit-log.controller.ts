import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogService } from './audit-log.service'
import { QueryAuditLogDto } from './dto/query-audit-log.dto'

@ApiTags('审计日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit log list with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit log list' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.findAll(query)
  }
}
