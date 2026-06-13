import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AppVersionService } from './app-version.service'
import { CreateVersionDto } from './dto/create-version.dto'
import { CheckVersionDto } from './dto/check-version.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { Throttle } from '@nestjs/throttler'

@ApiTags('App Version')
@Controller('app/version')
export class AppVersionController {
  constructor(private readonly versionService: AppVersionService) {}

  @Get('check')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '检查版本更新（公开）' })
  async checkVersion(@Query() dto: CheckVersionDto) {
    return this.versionService.checkVersion(dto.platform, dto.currentVersion)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: '创建版本（Admin）' })
  async create(@Body() dto: CreateVersionDto) {
    return this.versionService.create(dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '版本列表（Admin）' })
  async findAll() {
    return this.versionService.findAll()
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: '更新版本信息（Admin）' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateVersionDto>) {
    return this.versionService.update(id, dto)
  }
}
