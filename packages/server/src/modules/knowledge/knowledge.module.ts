import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { ArticleLike } from './entities/article-like.entity'
import { ArticleFavorite } from './entities/article-favorite.entity'
import { ArticleComment } from './entities/article-comment.entity'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './knowledge.service'
import { ArticleCommentService } from './article-comment.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeArticle,
      KnowledgeCategory,
      ArticleLike,
      ArticleFavorite,
      ArticleComment,
    ]),
    BullModule.registerQueue({ name: 'embedding' }),
    AiModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, ArticleCommentService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
