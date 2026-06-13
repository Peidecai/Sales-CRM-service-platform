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
import { UserRole } from '@crm/shared'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { CustomerGroupService } from './customer-group.service'
import {
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
  AddMembersDto,
  BatchActionDto,
} from './dto'

interface JwtUser {
  userId: number
  role: string
}

@Controller('customer-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class CustomerGroupController {
  constructor(private readonly service: CustomerGroupService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.service.findAll(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      user.userId,
      user.role,
    )
    return {
      list: result.list,
      total: result.total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    }
  }

  @Post()
  async create(@Body() dto: CreateCustomerGroupDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.userId)
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerGroupDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id)
    return { success: true }
  }

  @Get(':id/members')
  async getMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const result = await this.service.getMembers(id, parseInt(page, 10), parseInt(pageSize, 10))
    return {
      list: result.list,
      total: result.total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    }
  }

  @Post(':id/members')
  async addMembers(@Param('id', ParseIntPipe) id: number, @Body() dto: AddMembersDto) {
    await this.service.addMembers(id, dto.customerIds)
    return { success: true }
  }

  @Delete(':id/members')
  async removeMembers(@Param('id', ParseIntPipe) id: number, @Body() dto: AddMembersDto) {
    await this.service.removeMembers(id, dto.customerIds)
    return { success: true }
  }

  @Post(':id/refresh')
  async refresh(@Param('id', ParseIntPipe) id: number) {
    await this.service.refreshDynamic(id)
    return { success: true }
  }

  @Post(':id/batch-action')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async batchAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BatchActionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.batchAction(id, dto.action, dto.params, user.userId)
  }

  @Get(':id/analytics')
  async analytics(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAnalytics(id)
  }
}
