import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiService } from './ai.service'
import { ClaudeService } from './claude.service'
import { CostTrackerService } from './cost-tracker.service'
import { PromptManagerService } from './prompt-manager.service'
import { AiFallbackService } from './ai-fallback.service'
import { ScriptRecommendService } from './script-recommend.service'
import { AiController } from './ai.controller'
import { VectorModule } from './vector/vector.module'
import { CallSummaryProcessor } from './processors/call-summary.processor'
import { EmbeddingProcessor } from './processors/embedding.processor'
import { CustomerProfileProcessor } from './processors/customer-profile.processor'
import { IntentPredictionProcessor } from './processors/intent-prediction.processor'
import { AnomalyDetectProcessor } from './processors/anomaly-detect.processor'
import { ReportGenerateProcessor } from './processors/report-generate.processor'
import { SalesForecastProcessor } from './processors/sales-forecast.processor'
import { CallRecord } from '../call-record/call-record.entity'
import { KnowledgeArticle } from '../knowledge/entities/knowledge-article.entity'
import { AiUsageLog } from './entities/ai-usage-log.entity'
import { PromptTemplate } from './entities/prompt-template.entity'
import { CustomerProfile } from './entities/customer-profile.entity'
import { IntentPrediction } from './entities/intent-prediction.entity'
import { AiAlert } from './entities/ai-alert.entity'
import { AiReport } from './entities/ai-report.entity'
import { SalesForecast } from './entities/sales-forecast.entity'
import { CompetitorReport } from './entities/competitor-report.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CallRecord,
      KnowledgeArticle,
      AiUsageLog,
      PromptTemplate,
      CustomerProfile,
      IntentPrediction,
      AiAlert,
      AiReport,
      SalesForecast,
      CompetitorReport,
    ]),
    BullModule.registerQueue(
      { name: 'call-summary' },
      { name: 'embedding' },
      { name: 'customer-profile' },
      { name: 'intent-prediction' },
      { name: 'anomaly-detect' },
      { name: 'report-generate' },
      { name: 'sales-forecast' },
    ),
    VectorModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    ClaudeService,
    CostTrackerService,
    PromptManagerService,
    AiFallbackService,
    ScriptRecommendService,
    CallSummaryProcessor,
    EmbeddingProcessor,
    CustomerProfileProcessor,
    IntentPredictionProcessor,
    AnomalyDetectProcessor,
    ReportGenerateProcessor,
    SalesForecastProcessor,
  ],
  exports: [AiService, ClaudeService, AiFallbackService, VectorModule, BullModule],
})
export class AiModule {}
