import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiService } from './ai.service'
import { ClaudeService } from './claude.service'
import { CostTrackerService } from './cost-tracker.service'
import { PromptManagerService } from './prompt-manager.service'
import { AiFallbackService } from './ai-fallback.service'
import { ScriptRecommendService } from './script-recommend.service'
import { AiAlertService } from './ai-alert.service'
import { AiReportService } from './ai-report.service'
import { AiForecastService } from './ai-forecast.service'
import { AiCompetitorService } from './ai-competitor.service'
import { AiProfileService } from './ai-profile.service'
import { AiPredictionService } from './ai-prediction.service'
import { AiAnalysisConfigService } from './ai-analysis-config.service'
import { CallAnalysisService } from './call-analysis.service'
import { AiController } from './ai.controller'
import { CallAnalysisController } from './call-analysis.controller'
import { AiCopilotService } from './ai-copilot.service'
import { AiEmployeeProfileService } from './ai-employee-profile.service'
import { AiCustomerProfileService } from './ai-customer-profile.service'
import { VectorModule } from './vector/vector.module'
import { CallSummaryProcessor } from './processors/call-summary.processor'
import { EmbeddingProcessor } from './processors/embedding.processor'
import { CustomerProfileProcessor } from './processors/customer-profile.processor'
import { IntentPredictionProcessor } from './processors/intent-prediction.processor'
import { AnomalyDetectProcessor } from './processors/anomaly-detect.processor'
import { ReportGenerateProcessor } from './processors/report-generate.processor'
import { SalesForecastProcessor } from './processors/sales-forecast.processor'
import { AiUsageLog } from '../ai-config/ai-usage-log.entity'
import { PromptTemplate } from './entities/prompt-template.entity'
import { CustomerProfile } from './entities/customer-profile.entity'
import { IntentPrediction } from './entities/intent-prediction.entity'
import { AiAlert } from './entities/ai-alert.entity'
import { AiReport } from './entities/ai-report.entity'
import { SalesForecast } from './entities/sales-forecast.entity'
import { CompetitorReport } from './entities/competitor-report.entity'
import { AiAnalysisConfig } from './entities/ai-analysis-config.entity'
import { CallAnalysisResult } from './entities/call-analysis-result.entity'
import { EmployeeBadge } from './entities/employee-badge.entity'
import { CallTranscript } from '../recording/entities/call-transcript.entity'
import { RecordingFile } from '../recording/entities/recording-file.entity'
import { CloudTranscriptionCallback } from '../recording/entities/cloud-transcription-callback.entity'
import { CallRecordModule } from '../call-record/call-record.module'
import { CustomerModule } from '../customer/customer.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiUsageLog,
      PromptTemplate,
      CustomerProfile,
      IntentPrediction,
      AiAlert,
      AiReport,
      SalesForecast,
      CompetitorReport,
      AiAnalysisConfig,
      CallAnalysisResult,
      EmployeeBadge,
      // Register CallTranscript and RecordingFile directly to avoid importing RecordingModule
      // (which would create a cross-module dep chain: AiModule → RecordingModule → CallRecordModule → AiModule)
      CallTranscript,
      RecordingFile,
      CloudTranscriptionCallback,
    ]),
    // Import modules instead of registering their entities directly
    CallRecordModule,
    CustomerModule,
    OpportunityModule,
    UserModule,
    forwardRef(() => KnowledgeModule),
    // Shared queues — general retry policy
    BullModule.registerQueue(
      {
        name: 'call-summary',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      },
      {
        name: 'embedding',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      },
    ),
    // AI-specific queues — longer backoff, timeout for LLM calls
    BullModule.registerQueue(
      {
        name: 'customer-profile',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
      {
        name: 'intent-prediction',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
      {
        name: 'anomaly-detect',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
      {
        name: 'report-generate',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
      {
        name: 'sales-forecast',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 100,
          timeout: 120000,
        },
      },
    ),
    VectorModule,
  ],
  controllers: [AiController, CallAnalysisController],
  providers: [
    AiService,
    ClaudeService,
    CostTrackerService,
    PromptManagerService,
    AiFallbackService,
    ScriptRecommendService,
    AiAlertService,
    AiReportService,
    AiForecastService,
    AiCompetitorService,
    AiProfileService,
    AiPredictionService,
    AiAnalysisConfigService,
    CallAnalysisService,
    CallSummaryProcessor,
    EmbeddingProcessor,
    CustomerProfileProcessor,
    IntentPredictionProcessor,
    AnomalyDetectProcessor,
    ReportGenerateProcessor,
    SalesForecastProcessor,
    AiCopilotService,
    AiEmployeeProfileService,
    AiCustomerProfileService,
  ],
  exports: [
    AiService,
    ClaudeService,
    AiFallbackService,
    AiAnalysisConfigService,
    CallAnalysisService,
    VectorModule,
  ],
})
export class AiModule {}
