import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CompetitorMention } from './entities/competitor-mention.entity'
import { AiReminder } from './entities/ai-reminder.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { AiService } from '../ai/ai.service'
import { AiReminderType, AiReminderPriority } from '@crm/shared'
import { CompetitorMentionQueryDto } from './dto'

@Injectable()
export class CompetitorDetectionService {
  private readonly logger = new Logger(CompetitorDetectionService.name)

  constructor(
    @InjectRepository(CompetitorMention)
    private readonly mentionRepo: Repository<CompetitorMention>,
    @InjectRepository(AiReminder)
    private readonly reminderRepo: Repository<AiReminder>,
    @InjectRepository(CallRecord)
    private readonly callRecordRepo: Repository<CallRecord>,
    private readonly aiService: AiService,
  ) {}

  async detectFromCallRecord(callRecordId: number): Promise<CompetitorMention[]> {
    const callRecord = await this.callRecordRepo.findOne({
      where: { id: callRecordId },
    })
    if (!callRecord) {
      this.logger.warn(`CallRecord #${callRecordId} not found`)
      return []
    }

    const textContent = callRecord.aiSummary ?? callRecord.notes ?? ''
    if (!textContent.trim()) {
      return []
    }

    const systemPrompt = `You are a competitive intelligence analyst. Extract competitor mentions from the call record text. Return ONLY valid JSON array: [{"name":"CompetitorName","context":"relevant quote","sentiment":"positive|negative|neutral"}]. If no competitors found, return [].`

    try {
      const response = await this.aiService.chat(systemPrompt, textContent, {
        temperature: 0.2,
        maxTokens: 1024,
      })
      const parsed = JSON.parse(response) as Array<{
        name: string
        context: string
        sentiment: string
      }>

      const mentions: CompetitorMention[] = []
      for (const item of parsed) {
        const mention = this.mentionRepo.create({
          callRecordId,
          opportunityId: callRecord.opportunityId ?? null,
          competitorName: String(item.name),
          context: item.context ? String(item.context) : null,
          sentiment: String(item.sentiment || 'neutral'),
        })
        const saved = await this.mentionRepo.save(mention)
        mentions.push(saved)

        // Create a reminder for the sales rep
        if (callRecord.userId) {
          const reminder = this.reminderRepo.create({
            opportunityId: callRecord.opportunityId ?? null,
            customerId: callRecord.customerId,
            userId: callRecord.userId,
            type: AiReminderType.COMPETITOR_MENTION,
            title: `竞品提及: ${item.name}`,
            content: `通话中提及竞品"${item.name}"，情感倾向: ${item.sentiment}。上下文: ${item.context ?? 'N/A'}`,
            priority:
              item.sentiment === 'positive' ? AiReminderPriority.HIGH : AiReminderPriority.MEDIUM,
          })
          await this.reminderRepo.save(reminder)
        }
      }
      return mentions
    } catch (err) {
      this.logger.warn(`Competitor detection failed for call record #${callRecordId}`, err)
      return []
    }
  }

  async getCompetitorReport(
    query: CompetitorMentionQueryDto,
  ): Promise<{ list: CompetitorMention[]; total: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const qb = this.mentionRepo.createQueryBuilder('m')

    if (query.callRecordId) {
      qb.andWhere('m.call_record_id = :crId', { crId: query.callRecordId })
    }
    if (query.opportunityId) {
      qb.andWhere('m.opportunity_id = :oppId', { oppId: query.opportunityId })
    }

    qb.orderBy('m.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total }
  }

  async getTopCompetitors(limit = 10): Promise<Array<{ competitorName: string; count: number }>> {
    const raw = (await this.mentionRepo
      .createQueryBuilder('m')
      .select('m.competitor_name', 'competitorName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.competitor_name')
      .orderBy('count', 'DESC')
      .take(limit)
      .getRawMany()) as Array<{ competitorName: string; count: string }>

    return raw.map((r) => ({ competitorName: r.competitorName, count: Number(r.count) }))
  }
}
