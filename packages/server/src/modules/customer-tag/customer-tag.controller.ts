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
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CustomerTagService } from './customer-tag.service'
import { CreateTagDto, BatchTagDto, AddTagsDto } from './dto'

@ApiTags('客户标签')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomerTagController {
  constructor(private readonly tagService: CustomerTagService) {}

  @Get('tags')
  @ApiOperation({ summary: '获取标签列表' })
  @ApiQuery({ name: 'group', required: false, description: '按分组筛选' })
  @ApiResponse({ status: 200, description: '标签列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('group') group?: string) {
    return this.tagService.findAll(group)
  }

  @Post('tags')
  @ApiOperation({ summary: '创建标签' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto)
  }

  @Put('tags/:id')
  @ApiOperation({ summary: '更新标签' })
  @ApiParam({ name: 'id', description: '标签ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateTagDto>) {
    return this.tagService.update(id, dto)
  }

  @Delete('tags/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除标签' })
  @ApiParam({ name: 'id', description: '标签ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tagService.remove(id)
    return null
  }

  @Post('customers/:id/tags')
  @ApiOperation({ summary: '为客户添加标签' })
  @ApiParam({ name: 'id', description: '客户ID', type: Number })
  @ApiResponse({ status: 201, description: '添加成功，返回客户当前标签列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addTags(@Param('id', ParseIntPipe) customerId: number, @Body() dto: AddTagsDto) {
    for (const tagId of dto.tagIds) {
      await this.tagService.addTagToCustomer(customerId, tagId)
    }
    return this.tagService.getTagsByCustomer(customerId)
  }

  @Delete('customers/:customerId/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除客户标签' })
  @ApiParam({ name: 'customerId', description: '客户ID', type: Number })
  @ApiParam({ name: 'tagId', description: '标签ID', type: Number })
  @ApiResponse({ status: 200, description: '移除成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeTag(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('tagId', ParseIntPipe) tagId: number,
  ) {
    await this.tagService.removeTagFromCustomer(customerId, tagId)
    return null
  }

  @Post('customers/batch-tags')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '批量为客户打标签' })
  @ApiResponse({ status: 201, description: '批量打标完成' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  async batchAddTags(@Body() dto: BatchTagDto) {
    await this.tagService.batchAddTags(dto.customerIds, dto.tagIds)
    return { message: '批量打标完成' }
  }
}
