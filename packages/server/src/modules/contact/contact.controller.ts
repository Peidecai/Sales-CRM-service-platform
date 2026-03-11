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
import { ContactService } from './contact.service'
import { CreateContactDto } from './dto/create-contact.dto'
import { UpdateContactDto } from './dto/update-contact.dto'
import { QueryContactDto } from './dto/query-contact.dto'

@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get('customers/:customerId/contacts')
  async findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() query: QueryContactDto,
  ) {
    const { list, total } = await this.contactService.findByCustomer(customerId, query)
    return { list, total, page: query.page ?? 1, pageSize: query.pageSize ?? 20 }
  }

  @Post('customers/:customerId/contacts')
  async create(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateContactDto,
  ) {
    dto.customerId = customerId
    return this.contactService.create(customerId, dto)
  }

  @Put('contacts/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactDto) {
    return this.contactService.update(id, dto)
  }

  @Delete('contacts/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contactService.remove(id)
    return null
  }

  @Post('contacts/check-duplicate')
  async checkDuplicate(@Body() body: { mobile?: string; email?: string }) {
    return this.contactService.checkDuplicate(body.mobile, body.email)
  }

  @Post('contacts/:id/set-primary')
  async setPrimary(@Param('id', ParseIntPipe) id: number) {
    return this.contactService.setPrimary(id)
  }
}
