import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UnicomPhoneBindingService } from './unicom-phone-binding.service'
import {
  CreateUnicomPhoneBindingDto,
  UpdateUnicomPhoneBindingDto,
} from './dto/unicom-phone-binding.dto'

@ApiTags('联通回调绑定')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('unicom-phone-bindings')
export class UnicomPhoneBindingController {
  constructor(private readonly bindingService: UnicomPhoneBindingService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取联通回调手机号绑定列表' })
  findAll(@Req() req: Request) {
    return this.bindingService.findAll(this.getRequestBaseUrl(req))
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '新增联通回调手机号绑定' })
  create(@Body() dto: CreateUnicomPhoneBindingDto, @Req() req: Request) {
    return this.bindingService.create(dto, this.getRequestBaseUrl(req))
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新联通回调手机号绑定' })
  @ApiParam({ name: 'id', description: '绑定 ID', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnicomPhoneBindingDto,
    @Req() req: Request,
  ) {
    return this.bindingService.update(id, dto, this.getRequestBaseUrl(req))
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除联通回调手机号绑定' })
  @ApiParam({ name: 'id', description: '绑定 ID', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.bindingService.remove(id)
    return null
  }

  private getRequestBaseUrl(req: Request): string | undefined {
    const host = this.firstHeader(req.headers['x-forwarded-host']) ?? req.get('host')
    if (!host) return req.get('origin')

    const protocol =
      this.firstHeader(req.headers['x-forwarded-proto']) ??
      (req.secure ? 'https' : req.protocol || 'http')

    return `${protocol}://${host}`
  }

  private firstHeader(value: string | string[] | undefined): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value
    return raw?.split(',')[0]?.trim() || undefined
  }
}
