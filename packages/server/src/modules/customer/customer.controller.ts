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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import type { Response } from 'express'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { CustomerService } from './customer.service'
import { CustomerExportService } from './services/customer-export.service'
import { CustomerImportService } from './services/customer-import.service'
import { DuplicateCheckService } from './services/duplicate-check.service'
import { CustomerMergeService } from './services/customer-merge.service'
import { NotificationService } from '../notification/notification.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { QueryCustomerDto } from './dto/query-customer.dto'
import { AllocateCustomerDto } from './dto/allocate-customer.dto'
import { CheckDuplicateDto } from './dto/check-duplicate.dto'
import { ImportCustomerDto } from './dto/import-customer.dto'
import { MergeCustomerDto } from './dto/merge-customer.dto'
import { CustomerImportLog, ImportStatus } from './entities/customer-import-log.entity'

@ApiTags('客户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly exportService: CustomerExportService,
    private readonly importService: CustomerImportService,
    private readonly duplicateCheckService: DuplicateCheckService,
    private readonly mergeService: CustomerMergeService,
    private readonly notificationService: NotificationService,
    @InjectQueue('customer-import') private readonly importQueue: Queue,
    @InjectRepository(CustomerImportLog)
    private readonly importLogRepo: Repository<CustomerImportLog>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get customer list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated customer list' })
  async findAll(@Query() query: QueryCustomerDto, @CurrentUser() user: AuthUser) {
    const { list, total } = await this.customerService.findAll(query, user)
    return {
      list,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export all customers as Excel' })
  async exportExcel(@Res() res: Response, @CurrentUser() user: AuthUser) {
    const buffer = await this.exportService.exportExcel(user)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', `attachment; filename=customers_${Date.now()}.xlsx`)
    res.send(buffer)
  }

  @Get('import/template')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Download import template' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateImportTemplate()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', 'attachment; filename=customer_import_template.xlsx')
    res.send(buffer)
  }

  @Get('import/system-fields')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get system field list for import mapping' })
  async getSystemFields() {
    return this.importService.getSystemFields()
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import customers from CSV data (async via Bull queue)' })
  @ApiResponse({ status: 200, description: 'Import job submitted' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  async importCsv(@Body() dto: ImportCustomerDto, @CurrentUser() user: AuthUser) {
    if (!dto.rows || !Array.isArray(dto.rows) || dto.rows.length === 0) {
      throw new BadRequestException('请提供有效的 CSV 数据')
    }
    if (dto.rows.length > 1000) {
      throw new BadRequestException('单次导入不能超过 1000 条记录')
    }
    if (!dto.mapping || Object.keys(dto.mapping).length === 0) {
      throw new BadRequestException('请提供字段映射关系')
    }

    // Create import log record
    const log = this.importLogRepo.create({
      userId: user.id,
      fileName: dto.fileName || `import_${Date.now()}.csv`,
      totalCount: dto.rows.length,
      status: ImportStatus.PENDING,
    })
    await this.importLogRepo.save(log)

    // Add job to Bull queue
    await this.importQueue.add({
      logId: log.id,
      rows: dto.rows,
      userId: user.id,
      mapping: dto.mapping,
    })

    return { logId: log.id, message: '导入任务已提交，处理中...' }
  }

  @Post('check-duplicate')
  @HttpCode(HttpStatus.OK)
  async checkDuplicate(@Body() dto: CheckDuplicateDto) {
    return this.duplicateCheckService.checkDuplicates(dto)
  }

  @Post('merge/preview')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async previewMerge(@Body() dto: MergeCustomerDto) {
    return this.mergeService.previewMerge(dto.primaryId, dto.secondaryId)
  }

  @Post('merge')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async executeMerge(@Body() dto: MergeCustomerDto) {
    return this.mergeService.executeMerge(dto.primaryId, dto.secondaryId)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthUser) {
    const customer = await this.customerService.create(dto)
    this.notificationService.customerCreated(user.id, user.username, customer.id, customer.name)
    return customer
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns customer detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only access own customers' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.customerService.findOne(id, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — SALES can only update own customers' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    const customer = await this.customerService.update(id, dto, user)
    this.notificationService.customerUpdated(user.id, user.username, customer.id, customer.name)
    return customer
  }

  @Put(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reassign customer to a different sales user' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiResponse({ status: 200, description: 'Customer reassigned successfully' })
  @ApiResponse({ status: 400, description: 'Target user is not active' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  @ApiResponse({ status: 404, description: 'Customer or target user not found' })
  async allocate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AllocateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    const customer = await this.customerService.allocate(id, dto)
    this.notificationService.customerUpdated(user.id, user.username, customer.id, customer.name)
    return customer
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: Number })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.customerService.remove(id)
    this.notificationService.customerDeleted(user.id, user.username, id)
    return null
  }
}
