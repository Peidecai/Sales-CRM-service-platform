import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './knowledge.service'

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeArticle, KnowledgeCategory])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
