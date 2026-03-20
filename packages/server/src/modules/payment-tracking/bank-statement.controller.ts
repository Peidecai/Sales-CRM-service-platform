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
import { BankStatementService } from './bank-statement.service'
import { MatchStatementDto, ImportCsvDto } from './dto/payment-tracking.dto'

@ApiTags('银行流水')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('bank-statements')
export class BankStatementController {
  constructor(private readonly stmtService: BankStatementService) {}

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '导入银行流水 CSV' })
  async importCsv(@Body() body: ImportCsvDto, @CurrentUser() user: AuthUser) {
    return this.stmtService.importCsv(body.csvContent, user)
  }

  @Post('auto-match')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '自动匹配' })
  async autoMatch() {
    return this.stmtService.autoMatch()
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '流水列表' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.stmtService.findAll(page, pageSize)
  }

  @Post(':id/match')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '手动匹配' })
  async match(@Param('id', ParseIntPipe) id: number, @Body() dto: MatchStatementDto) {
    return this.stmtService.manualMatch(id, dto)
  }
}
