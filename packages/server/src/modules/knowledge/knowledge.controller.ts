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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { KnowledgeService } from './knowledge.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { QueryArticleDto } from './dto/query-article.dto'
import { CreateCategoryDto } from './dto/create-category.dto'

@ApiTags('知识库')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ---- Article Endpoints ----

  @Get('articles')
  @ApiOperation({ summary: 'Get article list with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated article list' })
  async findAllArticles(@Query() query: QueryArticleDto) {
    const { list, total } = await this.knowledgeService.findAllArticles(query)
    return {
      list,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create a new knowledge article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  createArticle(@Body() dto: CreateArticleDto) {
    return this.knowledgeService.createArticle(dto)
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Get article by ID (also increments view count)' })
  @ApiResponse({ status: 200, description: 'Returns article detail' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  findOneArticle(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.findOneArticle(id)
  }

  @Put('articles/:id')
  @ApiOperation({ summary: 'Update article by ID' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  updateArticle(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.knowledgeService.updateArticle(id, dto)
  }

  @Delete('articles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete article by ID' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async removeArticle(@Param('id', ParseIntPipe) id: number) {
    await this.knowledgeService.removeArticle(id)
    return null
  }

  // ---- Category Endpoints ----

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories sorted by sort ASC' })
  @ApiResponse({ status: 200, description: 'Returns category list' })
  findAllCategories() {
    return this.knowledgeService.findAllCategories()
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.knowledgeService.createCategory(dto)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete category by ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.knowledgeService.removeCategory(id)
    return null
  }
}
