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
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { KnowledgeService } from './knowledge.service'
import { CreateArticleDto } from './dto/create-article.dto'
import { UpdateArticleDto } from './dto/update-article.dto'
import { QueryArticleDto } from './dto/query-article.dto'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { ReviewArticleDto } from './dto/review-article.dto'
import { SetTopRecommendDto } from './dto/set-top-recommend.dto'
import { CreateCommentDto } from './dto/create-comment.dto'
import { ArticleCommentService } from './article-comment.service'
import { ArticleActionResponseDto } from './dto/article-action-response.dto'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { AskQuestionDto } from '../ai/dto/ask-question.dto'

@ApiTags('知识库')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly articleCommentService: ArticleCommentService,
  ) {}

  // ---- Article Endpoints ----

  @Get('articles')
  @ApiOperation({
    summary: 'Get article list with pagination (keyword triggers fulltext search + history)',
  })
  @ApiResponse({ status: 200, description: 'Returns paginated article list' })
  async findAllArticles(@Query() query: QueryArticleDto, @CurrentUser('id') userId: number) {
    const { list, total } = await this.knowledgeService.findAllArticles(query)
    if (query.keyword?.trim()) {
      void this.knowledgeService.pushSearchHistory(userId, query.keyword.trim())
    }
    return {
      list,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  @Get('search/history')
  @ApiOperation({ summary: 'Get current user search history (last 50)' })
  @ApiResponse({ status: 200, description: 'Returns array of search keywords' })
  getSearchHistory(@CurrentUser('id') userId: number) {
    return this.knowledgeService.getSearchHistory(userId)
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: 'Get search suggestions by prefix' })
  @ApiResponse({ status: 200, description: 'Returns up to 10 suggestion strings' })
  getSearchSuggestions(@Query('q') q: string, @CurrentUser('id') userId: number) {
    return this.knowledgeService.getSearchSuggestions(userId, q ?? '')
  }

  @Post('articles')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new knowledge article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  createArticle(@Body() dto: CreateArticleDto) {
    return this.knowledgeService.createArticle(dto)
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Get article by ID (also increments view count)' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns article detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  findOneArticle(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.findOneArticle(id)
  }

  @Post('articles/:id/like')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Toggle like/unlike for current user' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns latest like/favorite status' })
  toggleLike(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<ArticleActionResponseDto> {
    return this.knowledgeService.toggleLike(id, userId)
  }

  @Post('articles/:id/favorite')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Toggle favorite/unfavorite for current user' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns latest like/favorite status' })
  toggleFavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<ArticleActionResponseDto> {
    return this.knowledgeService.toggleFavorite(id, userId)
  }

  @Get('articles/:id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Get current user like/favorite status for article' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns latest like/favorite status' })
  getArticleStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<ArticleActionResponseDto> {
    return this.knowledgeService.getArticleActionStatus(id, userId)
  }

  @Get('favorites')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Get favorite articles for current user' })
  @ApiResponse({ status: 200, description: 'Returns favorite article list' })
  getUserFavorites(@CurrentUser('id') userId: number): Promise<KnowledgeArticle[]> {
    return this.knowledgeService.getUserFavorites(userId)
  }

  @Put('articles/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update article by ID' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  updateArticle(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.knowledgeService.updateArticle(id, dto)
  }

  @Post('articles/:id/submit')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Submit article for review (draft → submitted)' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  submitArticle(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.submitArticle(id)
  }

  @Post('articles/:id/review')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Review article (submitted → published/rejected)' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  reviewArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewArticleDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.knowledgeService.reviewArticle(id, dto.approved, dto.remark, userId)
  }

  @Post('articles/:id/publish')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Publish article directly' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  publishArticle(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.publishArticle(id)
  }

  @Post('articles/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reject submitted article' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  rejectArticle(@Param('id', ParseIntPipe) id: number, @Body('remark') remark?: string) {
    return this.knowledgeService.rejectArticle(id, remark)
  }

  @Post('articles/:id/offline')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Take article offline' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  offlineArticle(@Param('id', ParseIntPipe) id: number) {
    return this.knowledgeService.offlineArticle(id)
  }

  @Put('articles/:id/top')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Set/unset article pin (top)' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  setTop(@Param('id', ParseIntPipe) id: number, @Body() dto: SetTopRecommendDto) {
    return this.knowledgeService.setTop(id, dto.value)
  }

  @Put('articles/:id/recommend')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Set/unset article recommend' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  setRecommend(@Param('id', ParseIntPipe) id: number, @Body() dto: SetTopRecommendDto) {
    return this.knowledgeService.setRecommend(id, dto.value)
  }

  @Delete('articles/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete article by ID' })
  @ApiParam({ name: 'id', description: 'Article ID', type: Number })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async removeArticle(@Param('id', ParseIntPipe) id: number) {
    await this.knowledgeService.removeArticle(id)
    return null
  }

  // ---- Category Endpoints ----

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories (list or tree when tree=true)' })
  @ApiResponse({ status: 200, description: 'Returns category list or nested tree' })
  async getCategories(@Query('tree') tree?: string) {
    if (tree === 'true') {
      return this.knowledgeService.findTree()
    }
    return this.knowledgeService.findAllCategories()
  }

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires ADMIN or MANAGER role' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.knowledgeService.createCategory(dto)
  }

  @Put('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update category by ID (syncs children path/level)' })
  @ApiParam({ name: 'id', description: 'Category ID', type: Number })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.knowledgeService.updateCategory(id, dto)
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID', type: Number })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.knowledgeService.removeCategory(id)
    return null
  }

  // ---- Comment Endpoints ----

  @Get('articles/:articleId/comments')
  @ApiOperation({ summary: 'Get nested comments for article' })
  @ApiParam({ name: 'articleId', type: Number })
  getComments(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    return this.articleCommentService.list(
      articleId,
      Number.isNaN(p) ? 1 : p,
      Number.isNaN(ps) ? 20 : ps,
    )
  }

  @Post('articles/:articleId/comments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Create comment or reply' })
  @ApiParam({ name: 'articleId', type: Number })
  createComment(
    @Param('articleId', ParseIntPipe) articleId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.articleCommentService.create(articleId, userId, dto)
  }

  @Delete('comments/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete comment (author or admin)' })
  @ApiParam({ name: 'id', description: 'Comment ID', type: Number })
  async removeComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
  ) {
    await this.articleCommentService.remove(id, userId, userRole)
    return null
  }

  // ---- AI / RAG Endpoints ----

  @Post('ask')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'AI knowledge Q&A (RAG)' })
  @ApiResponse({
    status: 200,
    description: 'Returns AI-generated answer with source references',
  })
  ask(@Body() dto: AskQuestionDto) {
    return this.knowledgeService.ask(dto.question, dto.topK)
  }
}
