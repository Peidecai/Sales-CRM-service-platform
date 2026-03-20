import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { SpeechTemplateService } from './speech-template.service'
import { SpeechAnnotationService } from './speech-annotation.service'
import { CreateSpeechTemplateDto } from './dto/create-speech-template.dto'
import { UpdateSpeechTemplateDto } from './dto/update-speech-template.dto'
import { QuerySpeechTemplateDto } from './dto/query-speech-template.dto'
import { CreateSpeechAnnotationDto } from './dto/create-speech-annotation.dto'
import { UpdateSpeechAnnotationDto } from './dto/update-speech-annotation.dto'

/* ==================== Speech Templates ==================== */

@ApiTags('话术模板')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('speech-templates')
export class SpeechTemplateController {
  constructor(private readonly templateService: SpeechTemplateService) {}

  @Get()
  @ApiOperation({ summary: '话术模板列表' })
  async findAll(@Query() query: QuerySpeechTemplateDto) {
    return this.templateService.findAll(query)
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '导出话术模板CSV' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.templateService.exportCsv()
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=speech-templates.csv',
    })
    res.send(csv)
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '话术使用统计' })
  async getStatistics() {
    return this.templateService.getStatistics()
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建话术模板' })
  async create(@Body() dto: CreateSpeechTemplateDto, @CurrentUser() user: AuthUser) {
    return this.templateService.create(dto, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: '话术模板详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.findOne(id)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新话术模板' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpeechTemplateDto) {
    return this.templateService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '删除话术模板' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.remove(id)
  }
}

/* ==================== Speech Categories ==================== */

@ApiTags('话术分类')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('speech-categories')
export class SpeechCategoryController {
  constructor(private readonly templateService: SpeechTemplateService) {}

  @Get()
  @ApiOperation({ summary: '话术分类列表' })
  async findAll() {
    return this.templateService.findAllCategories()
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建话术分类' })
  async create(@Body() body: { name: string; code: string; sort?: number }) {
    return this.templateService.createCategory(body)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新话术分类' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; code?: string; sort?: number },
  ) {
    return this.templateService.updateCategory(id, body)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '删除话术分类' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.removeCategory(id)
  }
}

/* ==================== Speech Annotations ==================== */

@ApiTags('话术标注')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('speech-annotations')
export class SpeechAnnotationController {
  constructor(private readonly annotationService: SpeechAnnotationService) {}

  @Get('call-record/:callRecordId')
  @ApiOperation({ summary: '获取通话的标注列表' })
  async findByCallRecord(@Param('callRecordId', ParseIntPipe) callRecordId: number) {
    return this.annotationService.findByCallRecord(callRecordId)
  }

  @Post()
  @ApiOperation({ summary: '创建话术标注' })
  async create(@Body() dto: CreateSpeechAnnotationDto, @CurrentUser() user: AuthUser) {
    return this.annotationService.create(dto, user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新话术标注' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpeechAnnotationDto) {
    return this.annotationService.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除话术标注' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.annotationService.remove(id)
  }
}
