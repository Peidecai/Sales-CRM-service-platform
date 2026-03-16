import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { UserRole } from '@crm/shared'
import { CallRecord } from './call-record.entity'
import { CreateCallRecordDto } from './dto/create-call-record.dto'
import { UpdateCallRecordDto } from './dto/update-call-record.dto'
import { QueryCallRecordDto } from './dto/query-call-record.dto'
import type { CallSummaryJobData } from '../ai/processors/call-summary.processor'
import type { AuthUser } from '../../common/decorators/current-user.decorator'

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

  async findAll(query: QueryCallRecordDto, user: AuthUser): Promise<CallRecordListResult> {
    const {
      page = 1,
      pageSize = 20,
      customerId,
      opportunityId,
      userId,
      startDate,
      endDate,
      callType,
      callResult,
    } = query

    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.customer', 'customer')
      .leftJoinAndSelect('cr.opportunity', 'opportunity')

    this.applyDataPermission(qb, user)

    if (customerId) {
      qb.andWhere('cr.customerId = :customerId', { customerId })
    }

    if (opportunityId) {
      qb.andWhere('cr.opportunityId = :opportunityId', { opportunityId })
    }

    if (userId && user.role !== UserRole.SALES) {
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

    if (callType) {
      qb.andWhere('cr.callType = :callType', { callType })
    }

    if (callResult) {
      qb.andWhere('cr.callResult = :callResult', { callResult })
    }

    qb.orderBy('cr.callAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()

    return { list, total, page, pageSize }
  }

  async findOne(id: number, user?: AuthUser): Promise<CallRecord> {
    const record = await this.callRecordRepository.findOne({
      where: { id },
      relations: ['customer', 'opportunity'],
    })

    if (!record) {
      throw new NotFoundException(`Call record with ID ${id} not found`)
    }

    this.checkOwnership(record, user)

    return record
  }

  async update(id: number, dto: UpdateCallRecordDto, user?: AuthUser): Promise<CallRecord> {
    const record = await this.findOne(id, user)
    const { callAt, ...rest } = dto
    Object.assign(record, rest)
    if (callAt) {
      record.callAt = new Date(callAt)
    }
    return this.callRecordRepository.save(record)
  }

  async remove(id: number): Promise<void> {
    const record = await this.findOne(id)
    await this.callRecordRepository.softRemove(record)
  }

  async getStats(user: AuthUser): Promise<CallRecordStats> {
    const qb = this.callRecordRepository.createQueryBuilder('cr')

    if (user.role === UserRole.SALES) {
      qb.andWhere('cr.userId = :currentUserId', { currentUserId: user.id })
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
      .andWhere('cr.callAt >= :weekStart', { weekStart })

    if (user.role === UserRole.SALES) {
      weekQb.andWhere('cr.userId = :currentUserId', { currentUserId: user.id })
    }

    const weekCount = await weekQb.getCount()

    return { totalCount, totalDuration, weekCount }
  }

  async exportCsv(user: AuthUser): Promise<string> {
    const qb = this.callRecordRepository
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.customer', 'customer')
      .leftJoinAndSelect('cr.opportunity', 'opportunity')

    this.applyDataPermission(qb, user)
    qb.orderBy('cr.callAt', 'DESC')

    const records = await qb.getMany()

    const header = '客户,商机,通话时间,时长(秒),呼叫类型,通话结果,估算时长(秒),备注,AI摘要'
    const rows = records.map((r) => {
      const customerName = r.customer ? r.customer.name : ''
      const opportunityTitle = r.opportunity ? r.opportunity.title : ''
      const callAt = r.callAt ? new Date(r.callAt).toISOString().replace('T', ' ').slice(0, 19) : ''
      return [
        this.escapeCsvField(customerName),
        this.escapeCsvField(opportunityTitle),
        this.escapeCsvField(callAt),
        String(r.duration ?? 0),
        this.escapeCsvField(r.callType ?? ''),
        this.escapeCsvField(r.callResult ?? ''),
        String(r.estimatedDuration ?? ''),
        this.escapeCsvField(r.notes ?? ''),
        this.escapeCsvField(r.aiSummary ?? ''),
      ].join(',')
    })

    // Add BOM for Excel UTF-8 compatibility
    return '\uFEFF' + [header, ...rows].join('\n')
  }

  /** Apply data permission: SALES users can only see their own records */
  private applyDataPermission(qb: SelectQueryBuilder<CallRecord>, user: AuthUser): void {
    if (user.role === UserRole.SALES) {
      qb.andWhere('cr.userId = :currentUserId', { currentUserId: user.id })
    }
  }

  /** Check ownership for single record access */
  private checkOwnership(record: CallRecord, user?: AuthUser): void {
    if (user && user.role === UserRole.SALES && record.userId !== user.id) {
      throw new ForbiddenException('您无权访问此通话记录')
    }
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * Submit a call record for AI summary generation.
   * Returns the Bull job ID for tracking.
   */
  async summarize(id: number, user?: AuthUser): Promise<{ jobId: string }> {
    const record = await this.findOne(id, user)

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
