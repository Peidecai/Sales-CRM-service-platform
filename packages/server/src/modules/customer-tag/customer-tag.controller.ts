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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CustomerTagService } from './customer-tag.service'
import { CreateTagDto, BatchTagDto } from './dto'

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomerTagController {
  constructor(private readonly tagService: CustomerTagService) {}

  @Get('tags')
  async findAll(@Query('group') group?: string) {
    return this.tagService.findAll(group)
  }

  @Post('tags')
  async create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto)
  }

  @Put('tags/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateTagDto>) {
    return this.tagService.update(id, dto)
  }

  @Delete('tags/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tagService.remove(id)
    return null
  }

  @Post('customers/:id/tags')
  async addTags(@Param('id', ParseIntPipe) customerId: number, @Body() body: { tagIds: number[] }) {
    for (const tagId of body.tagIds) {
      await this.tagService.addTagToCustomer(customerId, tagId)
    }
    return this.tagService.getTagsByCustomer(customerId)
  }

  @Delete('customers/:customerId/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  async removeTag(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('tagId', ParseIntPipe) tagId: number,
  ) {
    await this.tagService.removeTagFromCustomer(customerId, tagId)
    return null
  }

  @Post('customers/batch-tags')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async batchAddTags(@Body() dto: BatchTagDto) {
    await this.tagService.batchAddTags(dto.customerIds, dto.tagIds)
    return { message: '批量打标完成' }
  }
}
