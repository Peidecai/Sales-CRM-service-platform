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
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { UserRole } from '@crm/shared'
import { ProductService } from './product.service'
import { ProductCategoryService } from './product-category.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { QueryProductDto } from './dto/query-product.dto'
import { CreateProductCategoryDto } from './dto/create-product-category.dto'
import { LinkProductDto } from './dto/link-product.dto'

@ApiTags('产品管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: ProductCategoryService,
  ) {}

  // ---- Products ----

  @Get()
  @ApiOperation({ summary: '产品分页列表' })
  @ApiResponse({ status: 200, description: '返回分页产品列表' })
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query)
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '导出产品 CSV' })
  @ApiResponse({ status: 200, description: '返回 CSV 文件' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.productService.exportCsv()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv')
    res.send(csv)
  }

  // ---- Categories ----

  @Get('categories/tree')
  @ApiOperation({ summary: '获取分类树' })
  @ApiResponse({ status: 200, description: '返回分类树结构' })
  getCategoryTree() {
    return this.categoryService.getTree()
  }

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建分类' })
  @ApiResponse({ status: 201, description: '分类创建成功' })
  createCategory(@Body() dto: CreateProductCategoryDto) {
    return this.categoryService.create(dto)
  }

  @Put('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新分类' })
  @ApiParam({ name: 'id', description: '分类ID', type: Number })
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateProductCategoryDto) {
    return this.categoryService.update(id, dto)
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除分类' })
  @ApiParam({ name: 'id', description: '分类ID', type: Number })
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id)
    return null
  }

  // ---- Opportunity Products ----

  @Get('opportunities/:opportunityId/products')
  @ApiOperation({ summary: '获取商机关联产品' })
  @ApiParam({ name: 'opportunityId', description: '商机ID', type: Number })
  getOpportunityProducts(@Param('opportunityId', ParseIntPipe) opportunityId: number) {
    return this.productService.getOpportunityProducts(opportunityId)
  }

  @Post('opportunities/:opportunityId/products')
  @ApiOperation({ summary: '关联产品到商机' })
  @ApiParam({ name: 'opportunityId', description: '商机ID', type: Number })
  @ApiResponse({ status: 201, description: '关联成功' })
  linkProducts(
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @Body() dto: LinkProductDto,
  ) {
    return this.productService.linkProducts(opportunityId, dto.items)
  }

  @Delete('opportunities/:opportunityId/products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除商机产品关联' })
  @ApiParam({ name: 'opportunityId', description: '商机ID', type: Number })
  @ApiParam({ name: 'id', description: '关联记录ID', type: Number })
  async unlinkProduct(
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.productService.unlinkProduct(opportunityId, id)
    return null
  }

  // ---- Product CRUD (parameterized routes last) ----

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '创建产品' })
  @ApiResponse({ status: 201, description: '产品创建成功' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: '产品详情' })
  @ApiParam({ name: 'id', description: '产品ID', type: Number })
  @ApiResponse({ status: 200, description: '返回产品详情' })
  @ApiResponse({ status: 404, description: '产品不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id)
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '更新产品' })
  @ApiParam({ name: 'id', description: '产品ID', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除产品' })
  @ApiParam({ name: 'id', description: '产品ID', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productService.remove(id)
    return null
  }
}
