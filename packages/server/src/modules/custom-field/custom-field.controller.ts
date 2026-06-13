import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CustomFieldService } from './custom-field.service'
import { CreateCustomFieldDto } from './dto/create-custom-field.dto'

@ApiTags('自定义字段')
@ApiBearerAuth()
@Controller('custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomFieldController {
  constructor(private readonly customFieldService: CustomFieldService) {}

  @Get()
  @ApiOperation({ summary: '获取自定义字段列表' })
  @ApiResponse({ status: 200, description: '自定义字段列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.customFieldService.findAll()
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建自定义字段' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  async create(@Body() dto: CreateCustomFieldDto) {
    return this.customFieldService.create(dto)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新自定义字段' })
  @ApiParam({ name: 'id', description: '自定义字段ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Custom field not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateCustomFieldDto>) {
    return this.customFieldService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除自定义字段' })
  @ApiParam({ name: 'id', description: '自定义字段ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Custom field not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.customFieldService.remove(id)
    return null
  }
}
