import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { CallRecord } from './call-record.entity'
import { CreateCallRecordDto } from './dto/create-call-record.dto'
import { UpdateCallRecordDto } from './dto/update-call-record.dto'
import { QueryCallRecordDto } from './dto/query-call-record.dto'
import type { CallSummaryJobData } from '../ai/processors/call-summary.processor'

export interface CallRecordListResult {
  list: CallRecord[]
  total: number
  page: number
  pageSize: number
}

export interface CallRecordStats {
  totalCount: number
  totalDuration: number
  weekCount: number
}

@Injectable()
export class CallRecordService {
  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @InjectQueue('call-summary')
    private readonly callSummaryQueue: Queue<CallSummaryJobData>,
  ) {}

  async create(dto: CreateCallRecordDto): Promise<CallRecord> {
    const record = this.callRecordRepository.create({
      ...dto,
      callAt: new Date(dto.callAt),
    })
    return this.callRecordRepository.save(record)
  }

  async findAll(query: QueryCallRecordDto): Promise<CallRecordListResult> {
    const { page = 1, pageSize = 20, customerId, opportunityId, userId, startDate, endDate } = query

    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.customer', 'customer')
      .leftJoinAndSelect('cr.opportunity', 'opportunity')
      .where('cr.deleted = :deleted', { deleted: false })

    if (customerId) {
      qb.andWhere('cr.customerId = :customerId', { customerId })
    }

    if (opportunityId) {
      qb.andWhere('cr.opportunityId = :opportunityId', { opportunityId })
    }

    if (userId) {
      qb.andWhere('cr.userId = :userId', { userId })
    }

    if (startDate) {
      qb.andWhere('cr.callAt >= :startDate', { startDate: new Date(startDate) })
    }

    if (endDate) {
      // Include the entire end day
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      qb.andWhere('cr.callAt <= :endDate', { endDate: end })
    }

    qb.orderBy('cr.callAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()

    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<CallRecord> {
    const record = await this.callRecordRepository.findOne({
      where: { id, deleted: false },
      relations: ['customer', 'opportunity'],
    })

    if (!record) {
      throw new NotFoundException(`Call record with ID ${id} not found`)
    }

    return record
  }

  async update(id: number, dto: UpdateCallRecordDto): Promise<CallRecord> {
    const record = await this.findOne(id)
    const { callAt, ...rest } = dto
    Object.assign(record, rest)
    if (callAt) {
      record.callAt = new Date(callAt)
    }
    return this.callRecordRepository.save(record)
  }

  async remove(id: number): Promise<void> {
    const record = await this.findOne(id)
    record.deleted = true
    await this.callRecordRepository.save(record)
  }

  async getStats(userId?: number): Promise<CallRecordStats> {
    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .where('cr.deleted = :deleted', { deleted: false })

    if (userId) {
      qb.andWhere('cr.userId = :userId', { userId })
    }

    const totalCount = await qb.getCount()

    const durationResult = await qb
      .select('SUM(cr.duration)', 'total')
      .getRawOne<{ total: string | null }>()
    const totalDuration = durationResult?.total ? parseInt(durationResult.total, 10) : 0

    // Current week: Monday 00:00:00 to Sunday 23:59:59
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun,1=Mon,...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - diffToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const weekQb = this.callRecordRepository
      .createQueryBuilder('cr')
      .where('cr.deleted = :deleted', { deleted: false })
      .andWhere('cr.callAt >= :weekStart', { weekStart })

    if (userId) {
      weekQb.andWhere('cr.userId = :userId', { userId })
    }

    const weekCount = await weekQb.getCount()

    return { totalCount, totalDuration, weekCount }
  }

  /**
   * Submit a call record for AI summary generation.
   * Returns the Bull job ID for tracking.
   */
  async summarize(id: number): Promise<{ jobId: string }> {
    const record = await this.findOne(id)

    if (!record.notes) {
      throw new BadRequestException(`Call record #${id} has no notes — cannot generate summary`)
    }

    const job = await this.callSummaryQueue.add(
      { callRecordId: id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    )

    return { jobId: String(job.id) }
  }
}
