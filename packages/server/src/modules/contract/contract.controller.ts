import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
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
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { ContractService } from './contract.service'
import { CreateContractDto } from './dto/create-contract.dto'
import { UpdateContractDto } from './dto/update-contract.dto'
import { QueryContractDto } from './dto/query-contract.dto'

@ApiTags('合同管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // ─── List ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '获取合同列表（分页）' })
  @ApiResponse({ status: 200, description: '分页合同列表' })
  findAll(@Query() query: QueryContractDto) {
    return this.contractService.findAll(query)
  }

  // ─── Static routes (MUST come before :id) ─────────────────────────────

  @Get('expiring')
  @ApiOperation({ summary: '获取即将到期的合同' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: '到期天数阈值，默认30天' })
  @ApiResponse({ status: 200, description: '即将到期的合同列表' })
  getExpiring(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) || 30 : 30
    return this.contractService.getExpiringContracts(d)
  }

  // ─── Create ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: '创建合同' })
  @ApiResponse({ status: 201, description: '合同创建成功' })
  create(@Body() dto: CreateContractDto, @CurrentUser('id') userId: number) {
    return this.contractService.create(dto, userId)
  }

  // ─── Parameterized routes ─────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '获取合同详情' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '合同详情' })
  @ApiResponse({ status: 404, description: '合同不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contractService.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新合同' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '合同更新成功' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContractDto) {
    return this.contractService.update(id, dto)
  }

  @Put(':id/sign')
  @ApiOperation({ summary: '确认签署合同' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '合同状态更新为已签署' })
  confirmSign(@Param('id', ParseIntPipe) id: number, @Body('signFileUrl') signFileUrl?: string) {
    return this.contractService.confirmSign(id, signFileUrl)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除合同（仅管理员/经理）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '合同已删除' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contractService.remove(id)
    return null
  }
}
