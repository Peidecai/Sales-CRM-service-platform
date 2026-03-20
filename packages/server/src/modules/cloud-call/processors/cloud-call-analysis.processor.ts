import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CloudCallRecord } from '../entities/cloud-call-record.entity'
import { AiService } from '../../ai/ai.service'

export interface CloudCallAnalysisJobData {
  cloudCallRecordId: number
  recordingUrl: string
}

@Processor('cloud-call-analysis')
export class CloudCallAnalysisProcessor {
  private readonly logger = new Logger(CloudCallAnalysisProcessor.name)

  constructor(
    @InjectRepository(CloudCallRecord)
    private readonly cloudCallRecordRepo: Repository<CloudCallRecord>,
    private readonly aiService: AiService,
  ) {}

  @Process()
  async handleAnalysis(job: Job<CloudCallAnalysisJobData>): Promise<void> {
    const { cloudCallRecordId, recordingUrl } = job.data
    this.logger.log(`Processing cloud call analysis for record #${cloudCallRecordId}`)

    const record = await this.cloudCallRecordRepo.findOne({ where: { id: cloudCallRecordId } })
    if (!record) {
      this.logger.warn(`Cloud call record #${cloudCallRecordId} not found, skipping`)
      return
    }

    try {
      // Step 1: Download recording (mock — in production, download from OSS)
      this.logger.log(`[MOCK] Downloading recording from: ${recordingUrl}`)

      // Step 2: ASR transcription (mock — in production, call ASR service)
      const mockTranscription = `[MOCK ASR] 销售: 您好，请问是张先生吗？\n客户: 是的，什么事？\n销售: 我们这边有一个新产品想给您介绍一下...`
      record.transcription = mockTranscription

      // Step 3: AI analysis
      const aiResult = await this.aiService.chat(
        '你是一个专业的销售通话分析助手。请分析以下通话转写文本，提取关键信息，输出结构化摘要（客户需求、跟进要点、下一步行动、通话质量评分1-10分）。',
        mockTranscription,
        { temperature: 0.3, maxTokens: 1024 },
      )

      // Step 4: Save results
      record.transcription = `${mockTranscription}\n\n---\n\n## AI 分析\n${aiResult}`
      await this.cloudCallRecordRepo.save(record)

      this.logger.log(`Cloud call analysis completed for record #${cloudCallRecordId}`)
    } catch (error) {
      this.logger.error(
        `Cloud call analysis failed for record #${cloudCallRecordId}`,
        (error as Error).stack,
      )
      throw error
    }
  }
}
