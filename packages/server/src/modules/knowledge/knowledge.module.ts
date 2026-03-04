import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { KnowledgeArticle } from './entities/knowledge-article.entity'
import { KnowledgeCategory } from './entities/knowledge-category.entity'
import { KnowledgeController } from './knowledge.controller'
import { KnowledgeService } from './knowledge.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeArticle, KnowledgeCategory]),
    BullModule.registerQueue({ name: 'embedding' }),
    AiModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
