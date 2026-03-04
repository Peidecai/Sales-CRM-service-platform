import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiService } from './ai.service'
import { VectorModule } from './vector/vector.module'
import { CallSummaryProcessor } from './processors/call-summary.processor'
import { EmbeddingProcessor } from './processors/embedding.processor'
import { CallRecord } from '../call-record/call-record.entity'
import { KnowledgeArticle } from '../knowledge/entities/knowledge-article.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRecord, KnowledgeArticle]),
    BullModule.registerQueue({ name: 'call-summary' }, { name: 'embedding' }),
    VectorModule,
  ],
  providers: [AiService, CallSummaryProcessor, EmbeddingProcessor],
  exports: [AiService, VectorModule, BullModule],
})
export class AiModule {}
