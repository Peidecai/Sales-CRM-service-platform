import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ForumCommentService } from './forum-comment.service'
import { CreateForumCommentDto } from './dto/create-forum-comment.dto'

@Controller('forum')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class ForumCommentController {
  constructor(private readonly commentService: ForumCommentService) {}

  @Get('posts/:postId/comments')
  async findByPost(
    @Param('postId', ParseIntPipe) postId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1
    const ps = pageSize ? parseInt(pageSize, 10) : 20
    const { list, total } = await this.commentService.findByPost(postId, p, ps)
    return { list, total, page: p, pageSize: ps }
  }

  @Post('posts/:postId/comments')
  async create(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateForumCommentDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.commentService.create(postId, dto, userId)
  }

  @Delete('comments/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ) {
    return this.commentService.remove(id, userId, userRole)
  }

  @Post('comments/:id/like')
  async toggleLike(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.commentService.toggleLike(userId, id)
  }
}
