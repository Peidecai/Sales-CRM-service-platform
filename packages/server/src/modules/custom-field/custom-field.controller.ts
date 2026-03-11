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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CustomFieldService } from './custom-field.service'
import { CreateCustomFieldDto } from './dto/create-custom-field.dto'

@Controller('api/v1/custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomFieldController {
  constructor(private readonly customFieldService: CustomFieldService) {}

  @Get()
  async findAll() {
    return this.customFieldService.findAll()
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateCustomFieldDto) {
    return this.customFieldService.create(dto)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateCustomFieldDto>) {
    return this.customFieldService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.customFieldService.remove(id)
    return null
  }
}
