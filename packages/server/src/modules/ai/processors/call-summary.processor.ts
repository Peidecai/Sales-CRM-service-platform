import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CallRecord } from '../../call-record/call-record.entity'
import { AiService } from '../ai.service'

export interface CallSummaryJobData {
  callRecordId: number
}

const SYSTEM_PROMPT = `你是一个专业的销售通话分析助手。请分析以下通话记录笔记，生成结构化摘要。

请按以下格式输出：
## 通话摘要
简述通话主要内容（1-2句话）

## 客户需求
- 列出客户提到的需求点

## 关键信息
- 列出通话中提到的关键信息（预算、时间线、决策人等）

## 跟进要点
- 列出需要后续跟进的事项

## 下一步行动
- 列出建议的下一步行动`

@Processor('call-summary')
export class CallSummaryProcessor {
  private readonly logger = new Logger(CallSummaryProcessor.name)

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    private readonly aiService: AiService,
  ) {}

  @Process()
  async handleSummary(job: Job<CallSummaryJobData>): Promise<void> {
    const { callRecordId } = job.data
    this.logger.log(`Processing call summary for record #${callRecordId}`)

    try {
      const record = await this.callRecordRepository.findOne({
        where: { id: callRecordId, deleted: false },
      })

      if (!record) {
        this.logger.warn(`Call record #${callRecordId} not found, skipping`)
        return
      }

      if (!record.notes) {
        this.logger.warn(`Call record #${callRecordId} has no notes, skipping`)
        return
      }

      const summary = await this.aiService.chat(SYSTEM_PROMPT, record.notes, {
        temperature: 0.3,
        maxTokens: 1024,
      })

      record.aiSummary = summary
      await this.callRecordRepository.save(record)

      this.logger.log(`Call summary generated for record #${callRecordId}`)
    } catch (error) {
      this.logger.error(`Failed to generate summary for record #${callRecordId}`, String(error))
      throw error // Let Bull retry
    }
  }
}
