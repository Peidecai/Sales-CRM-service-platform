import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ForumCategory } from './entities/forum-category.entity'
import { ForumPost } from './entities/forum-post.entity'
import { ForumComment } from './entities/forum-comment.entity'
import { ForumLike } from './entities/forum-like.entity'
import { ForumFavorite } from './entities/forum-favorite.entity'
import { ForumCategoryController } from './forum-category.controller'
import { ForumPostController } from './forum-post.controller'
import { ForumCommentController } from './forum-comment.controller'
import { ForumCategoryService } from './forum-category.service'
import { ForumPostService } from './forum-post.service'
import { ForumCommentService } from './forum-comment.service'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ForumCategory, ForumPost, ForumComment, ForumLike, ForumFavorite]),
    UserModule,
  ],
  controllers: [ForumCategoryController, ForumPostController, ForumCommentController],
  providers: [ForumCategoryService, ForumPostService, ForumCommentService],
  exports: [ForumPostService, TypeOrmModule],
})
export class ForumModule {}
