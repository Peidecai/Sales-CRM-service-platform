import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { ArticleLike } from './entities/article-like.entity'
import { ArticleFavorite } from './entities/article-favorite.entity'
import { ArticleComment } from './entities/article-comment.entity'
import { KnowledgeArticleVersion } from './entities/knowledge-article-version.entity'
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
      KnowledgeArticleVersion,
    ]),
    forwardRef(() => AiModule), // Circular: AiModule ↔ KnowledgeModule
    // Register embedding queue directly — AiModule no longer re-exports BullModule
    BullModule.registerQueue({
      name: 'embedding',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, ArticleCommentService],
  exports: [KnowledgeService, TypeOrmModule],
})
export class KnowledgeModule {}
