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
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ForumPostService } from './forum-post.service'
import { CreateForumPostDto } from './dto/create-forum-post.dto'
import { UpdateForumPostDto } from './dto/update-forum-post.dto'
import { ForumPostQueryDto } from './dto/forum-post-query.dto'
import { ModeratePostDto } from './dto/moderate-post.dto'

@Controller('forum/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ForumPostController {
  constructor(private readonly postService: ForumPostService) {}

  @Get()
  async findAll(@Query() query: ForumPostQueryDto) {
    const { list, total } = await this.postService.findAll(query)
    return {
      list,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    }
  }

  @Post()
  async create(@Body() dto: CreateForumPostDto, @CurrentUser('id') userId: number) {
    return this.postService.create(dto, userId)
  }

  @Get('favorites')
  async getFavorites(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    const { list, total } = await this.postService.findFavorites(userId, p, ps)
    return { list, total, page: p, pageSize: ps }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.postService.findOne(id, userId)
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateForumPostDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.postService.update(id, dto, userId)
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    return this.postService.remove(id, userId, userRole)
  }

  @Put(':id/moderate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async moderate(@Param('id', ParseIntPipe) id: number, @Body() dto: ModeratePostDto) {
    return this.postService.moderate(id, dto)
  }

  @Post(':id/like')
  async toggleLike(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.postService.toggleLike(userId, id)
  }

  @Post(':id/favorite')
  async toggleFavorite(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.postService.toggleFavorite(userId, id)
  }
}
