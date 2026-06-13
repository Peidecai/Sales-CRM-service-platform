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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { AnnotationService } from './annotation.service'
import { CreateAnnotationDto } from './dto/create-annotation.dto'
import { UpdateAnnotationDto } from './dto/update-annotation.dto'
import { QueryAnnotationDto } from './dto/query-annotation.dto'

@ApiTags('批注')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('annotations')
export class AnnotationController {
  constructor(private readonly annotationService: AnnotationService) {}

  @Get()
  @ApiOperation({ summary: '批注列表' })
  async list(@Query() query: QueryAnnotationDto, @CurrentUser() user: AuthUser) {
    const { list, total } = await this.annotationService.findAll(query, user)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Get('my')
  @ApiOperation({ summary: '我的批注' })
  async myAnnotations(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    const { list, total } = await this.annotationService.getMyAnnotations(userId, p, ps)
    return { list, total, page: p, pageSize: ps }
  }

  @Get('target/:targetType/:targetId')
  @ApiOperation({ summary: '按目标获取批注' })
  @ApiParam({ name: 'targetType', type: String })
  @ApiParam({ name: 'targetId', type: Number })
  getByTarget(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.annotationService.getByTarget(targetType, targetId)
  }

  @Get(':id')
  @ApiOperation({ summary: '批注详情' })
  @ApiParam({ name: 'id', type: Number })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.annotationService.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '创建批注' })
  create(@Body() dto: CreateAnnotationDto, @CurrentUser('id') userId: number) {
    return this.annotationService.create(userId, dto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新批注' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnotationDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.annotationService.update(id, userId, dto)
  }

  @Put(':id/resolve')
  @ApiOperation({ summary: '解决批注' })
  @ApiParam({ name: 'id', type: Number })
  resolve(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.annotationService.resolve(id, userId)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除批注' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    await this.annotationService.remove(id, userId)
    return null
  }
}
