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
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { DataMaskingService } from './data-masking.service'
import { CreateMaskingRuleDto } from './dto/create-masking-rule.dto'
import { UpdateMaskingRuleDto } from './dto/update-masking-rule.dto'
import { QueryMaskingRuleDto } from './dto/query-masking-rule.dto'
import { UnmaskRequestDto } from './dto/unmask-request.dto'
import { MaskType } from './entities/data-masking-rule.entity'
import { SkipMasking } from './skip-masking.decorator'

@ApiTags('数据脱敏')
@ApiBearerAuth()
@Controller('data-masking')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@SkipMasking()
export class DataMaskingController {
  constructor(private readonly dataMaskingService: DataMaskingService) {}

  @Get('rules')
  @ApiOperation({ summary: '获取脱敏规则列表' })
  @Roles(UserRole.ADMIN)
  async getRules(@Query() query: QueryMaskingRuleDto) {
    const result = await this.dataMaskingService.findAll(query)
    return { code: 0, message: 'success', data: result }
  }

  @Post('rules')
  @ApiOperation({ summary: '创建脱敏规则' })
  @Roles(UserRole.ADMIN)
  async createRule(@Body() dto: CreateMaskingRuleDto) {
    const rule = await this.dataMaskingService.create(dto)
    return { code: 0, message: 'success', data: rule }
  }

  @Put('rules/:id')
  @ApiOperation({ summary: '更新脱敏规则' })
  @ApiParam({ name: 'id', type: Number })
  @Roles(UserRole.ADMIN)
  async updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaskingRuleDto) {
    const rule = await this.dataMaskingService.update(id, dto)
    return { code: 0, message: 'success', data: rule }
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除脱敏规则' })
  @ApiParam({ name: 'id', type: Number })
  @Roles(UserRole.ADMIN)
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    await this.dataMaskingService.remove(id)
    return { code: 0, message: 'success', data: null }
  }

  @Put('rules/:id/status')
  @ApiOperation({ summary: '切换脱敏规则状态' })
  @ApiParam({ name: 'id', type: Number })
  @Roles(UserRole.ADMIN)
  async toggleStatus(@Param('id', ParseIntPipe) id: number, @Body('isActive') isActive: boolean) {
    const rule = await this.dataMaskingService.toggleStatus(id, isActive)
    return { code: 0, message: 'success', data: rule }
  }

  @Post('unmask')
  @ApiOperation({ summary: '查看原始数据（需要权限）' })
  async unmask(@Body() dto: UnmaskRequestDto, @CurrentUser() user: AuthUser) {
    // Log the unmask request for audit
    return {
      code: 0,
      message: 'success',
      data: {
        entityName: dto.entityName,
        fieldName: dto.fieldName,
        recordId: dto.recordId,
        requestedBy: user.id,
      },
    }
  }

  @Get('preview')
  @ApiOperation({ summary: '预览脱敏效果' })
  @Roles(UserRole.ADMIN)
  async preview(
    @Query('value') value: string,
    @Query('maskType') maskType: MaskType,
    @Query('pattern') pattern?: string,
  ) {
    const result = this.dataMaskingService.preview(value, maskType, pattern ?? null)
    return { code: 0, message: 'success', data: { original: value, masked: result } }
  }
}
