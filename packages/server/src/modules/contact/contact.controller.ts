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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { ContactService } from './contact.service'
import { CreateContactDto } from './dto/create-contact.dto'
import { UpdateContactDto } from './dto/update-contact.dto'
import { QueryContactDto } from './dto/query-contact.dto'

@ApiTags('联系人')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get('customers/:customerId/contacts')
  @ApiOperation({ summary: '获取客户的联系人列表' })
  @ApiParam({ name: 'customerId', description: '客户ID', type: Number })
  @ApiResponse({ status: 200, description: '分页联系人列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: QueryContactDto,
  ) {
    const { list, total } = await this.contactService.findByCustomer(customerId, query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Post('customers/:customerId/contacts')
  @ApiOperation({ summary: '创建联系人' })
  @ApiParam({ name: 'customerId', description: '客户ID', type: Number })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateContactDto,
  ) {
    dto.customerId = customerId
    return this.contactService.create(customerId, dto)
  }

  @Put('contacts/:id')
  @ApiOperation({ summary: '更新联系人' })
  @ApiParam({ name: 'id', description: '联系人ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactDto) {
    return this.contactService.update(id, dto)
  }

  @Delete('contacts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除联系人' })
  @ApiParam({ name: 'id', description: '联系人ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contactService.remove(id)
    return null
  }

  @Post('contacts/check-duplicate')
  @ApiOperation({ summary: '联系人查重' })
  @ApiResponse({ status: 200, description: '返回重复检测结果' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkDuplicate(@Body() body: { mobile?: string; email?: string }) {
    return this.contactService.checkDuplicate(body.mobile, body.email)
  }

  @Post('contacts/:id/set-primary')
  @ApiOperation({ summary: '设为主要联系人' })
  @ApiParam({ name: 'id', description: '联系人ID', type: Number })
  @ApiResponse({ status: 200, description: '设置成功' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async setPrimary(@Param('id', ParseIntPipe) id: number) {
    return this.contactService.setPrimary(id)
  }
}
