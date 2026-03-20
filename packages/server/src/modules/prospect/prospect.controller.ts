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
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'

interface UploadedFileShape {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import type { ProspectSearchResult } from '@crm/shared'
import { ProspectService } from './prospect.service'
import { ProspectConfigService } from './prospect-config.service'
import { ProspectImportService } from './prospect-import.service'
import { ProspectExportService } from './prospect-export.service'
import { SearchProspectDto } from './dto/search-prospect.dto'
import { QueryProspectDto } from './dto/query-prospect.dto'
import { UpdateProspectDto } from './dto/update-prospect.dto'
import { ConvertProspectDto } from './dto/convert-prospect.dto'
import { BatchOperationDto } from './dto/batch-operation.dto'
import { CreateDataSourceDto } from './dto/create-data-source.dto'
import { UpdateDataSourceDto } from './dto/update-data-source.dto'
import { CreateSearchTemplateDto } from './dto/create-search-template.dto'
import { UpdateFilterConfigDto } from './dto/update-filter-config.dto'

@ApiTags('互联网获客')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('prospects')
export class ProspectController {
  constructor(
    private readonly prospectService: ProspectService,
    private readonly prospectConfigService: ProspectConfigService,
    private readonly prospectImportService: ProspectImportService,
    private readonly prospectExportService: ProspectExportService,
  ) {}

  // ===== Data Sources (Admin only) — MUST be before :id routes =====

  @Get('data-sources')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有数据源配置' })
  @ApiResponse({ status: 200, description: '返回所有数据源列表' })
  async getDataSources() {
    return this.prospectConfigService.getDataSources()
  }

  @Post('data-sources')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建数据源' })
  @ApiResponse({ status: 201, description: '数据源创建成功' })
  async createDataSource(@Body() dto: CreateDataSourceDto) {
    return this.prospectConfigService.createDataSource(dto)
  }

  @Put('data-sources/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新数据源' })
  @ApiParam({ name: 'id', description: '数据源ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '数据源不存在' })
  async updateDataSource(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDataSourceDto) {
    return this.prospectConfigService.updateDataSource(id, dto)
  }

  @Delete('data-sources/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除数据源（软删除）' })
  @ApiParam({ name: 'id', description: '数据源ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '数据源不存在' })
  async deleteDataSource(@Param('id', ParseIntPipe) id: number) {
    await this.prospectConfigService.deleteDataSource(id)
    return null
  }

  @Post('data-sources/:id/test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试数据源连接' })
  @ApiParam({ name: 'id', description: '数据源ID', type: Number })
  @ApiResponse({ status: 200, description: '返回连接测试结果' })
  async testDataSource(@Param('id', ParseIntPipe) id: number) {
    return this.prospectConfigService.testDataSource(id)
  }

  // ===== Search Templates (All authenticated users) — MUST be before :id routes =====

  @Get('search-templates')
  @ApiOperation({ summary: '获取搜索模板' })
  @ApiResponse({ status: 200, description: '返回当前用户可见的搜索模板' })
  async getSearchTemplates(@CurrentUser() user: AuthUser) {
    return this.prospectConfigService.getSearchTemplates(user.id, user.role)
  }

  @Post('search-templates')
  @ApiOperation({ summary: '创建搜索模板' })
  @ApiResponse({ status: 201, description: '模板创建成功' })
  async createSearchTemplate(@CurrentUser() user: AuthUser, @Body() dto: CreateSearchTemplateDto) {
    return this.prospectConfigService.createSearchTemplate(user.id, dto)
  }

  @Put('search-templates/:id')
  @ApiOperation({ summary: '更新搜索模板' })
  @ApiParam({ name: 'id', description: '模板ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  async updateSearchTemplate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSearchTemplateDto,
  ) {
    return this.prospectConfigService.updateSearchTemplate(id, user.id, user.role, dto)
  }

  @Delete('search-templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除搜索模板' })
  @ApiParam({ name: 'id', description: '模板ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  async deleteSearchTemplate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prospectConfigService.deleteSearchTemplate(id, user.id, user.role)
    return null
  }

  // ===== Import / Export — MUST be before :id routes =====

  @Get('import-template')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '下载线索导入模板' })
  @ApiResponse({ status: 200, description: '返回 Excel 模板文件' })
  async downloadImportTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.prospectImportService.generateImportTemplate()
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', 'attachment; filename=prospect-import-template.xlsx')
    res.send(buffer)
  }

  @Post('import-excel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: '导入 Excel 为线索' })
  @ApiResponse({ status: 200, description: '返回导入结果' })
  async importExcel(
    @UploadedFile() file: UploadedFileShape | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('请上传 Excel 文件')
    return this.prospectImportService.importAsProspect(file.buffer, user)
  }

  @Post('import-as-customer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: '导入 Excel 直接为客户' })
  @ApiResponse({ status: 200, description: '返回导入结果' })
  async importAsCustomer(
    @UploadedFile() file: UploadedFileShape | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('请上传 Excel 文件')
    return this.prospectImportService.importAsCustomer(file.buffer, user)
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '导出线索为 Excel' })
  @ApiResponse({ status: 200, description: '返回 Excel 文件' })
  async exportExcel(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.prospectExportService.exportExcel(user)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', 'attachment; filename=prospects-export.xlsx')
    res.send(buffer)
  }

  // ===== Filter Config — MUST be before :id routes =====

  @Get('filter-config')
  @ApiOperation({ summary: '获取筛选配置' })
  @ApiResponse({ status: 200, description: '返回当前筛选字段配置' })
  async getFilterConfig() {
    return this.prospectConfigService.getFilterConfig()
  }

  @Put('filter-config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新筛选配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateFilterConfig(@Body() dto: UpdateFilterConfigDto, @CurrentUser() user: AuthUser) {
    return this.prospectConfigService.updateFilterConfig(dto, user.id)
  }

  // ===== Prospect core routes =====

  @Post('search')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '搜索外部企业数据' })
  @ApiResponse({ status: 200, description: '返回搜索结果（含查重标记）' })
  @ApiResponse({ status: 403, description: '需要 ADMIN 或 MANAGER 权限' })
  search(@Body() dto: SearchProspectDto, @CurrentUser() user: AuthUser) {
    return this.prospectService.search(dto, user)
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '将搜索结果导入到线索池' })
  @ApiResponse({ status: 200, description: '返回导入结果（imported/skipped 数量）' })
  import(@Body() body: { results: ProspectSearchResult[] }, @CurrentUser() user: AuthUser) {
    return this.prospectService.importToPool(body.results, user)
  }

  @Post('convert')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量转化线索为客户' })
  @ApiResponse({ status: 200, description: '返回转化结果' })
  @ApiResponse({ status: 403, description: '需要 ADMIN 或 MANAGER 权限' })
  convert(@Body() dto: ConvertProspectDto, @CurrentUser() user: AuthUser) {
    return this.prospectService.convert(dto, user)
  }

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量操作（分配/废弃/删除）' })
  @ApiResponse({ status: 200, description: '返回操作影响条数' })
  @ApiResponse({ status: 403, description: '需要 ADMIN 或 MANAGER 权限' })
  batchOperate(@Body() dto: BatchOperationDto, @CurrentUser() user: AuthUser) {
    return this.prospectService.batchOperate(dto, user)
  }

  @Get()
  @ApiOperation({ summary: '线索池列表（分页）' })
  @ApiResponse({ status: 200, description: '返回分页线索列表' })
  async findAll(@Query() query: QueryProspectDto, @CurrentUser() user: AuthUser) {
    const { list, total } = await this.prospectService.findAll(query, user)
    return {
      list,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '线索统计数据' })
  @ApiResponse({ status: 200, description: '返回各状态线索数量和转化率' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.prospectService.getStats(user)
  }

  @Get('search-history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '搜索历史记录' })
  @ApiResponse({ status: 200, description: '返回当前用户的搜索历史' })
  getSearchHistory(@CurrentUser() user: AuthUser) {
    return this.prospectService.getSearchHistory(user)
  }

  @Get('query-history')
  @ApiOperation({ summary: '查询历史记录' })
  @ApiResponse({ status: 200, description: '返回当前用户的查询历史' })
  getQueryHistory(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    return this.prospectService.getQueryHistory(user.id, p, ps)
  }

  @Delete('query-history/:id')
  @ApiOperation({ summary: '删除查询历史' })
  @ApiParam({ name: 'id', description: '查询历史ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteQueryHistory(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prospectService.deleteQueryHistory(id, user.id)
    return null
  }

  // ===== Parameterized :id routes — MUST be last =====

  @Get(':id')
  @ApiOperation({ summary: '线索详情' })
  @ApiParam({ name: 'id', description: '线索ID', type: Number })
  @ApiResponse({ status: 200, description: '返回线索详情' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.prospectService.findOne(id, user)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新线索信息' })
  @ApiParam({ name: 'id', description: '线索ID', type: Number })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProspectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.prospectService.update(id, dto, user)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除线索（软删除）' })
  @ApiParam({ name: 'id', description: '线索ID', type: Number })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '需要 ADMIN 或 MANAGER 权限' })
  @ApiResponse({ status: 404, description: '线索不存在' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    await this.prospectService.remove(id, user)
    return null
  }
}
