import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, SelectQueryBuilder } from 'typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { CallDirection, CallStatus, CallType, UserRole } from '@crm/shared'
import { CallRecord } from './call-record.entity'
import { CreateCallRecordDto } from './dto/create-call-record.dto'
import { CreateNativeOutboundCallDto } from './dto/create-native-outbound-call.dto'
import { UpdateCallRecordDto } from './dto/update-call-record.dto'
import { QueryCallRecordDto } from './dto/query-call-record.dto'
import { Customer } from '../customer/customer.entity'
import { User } from '../user/user.entity'
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

const MAX_NATIVE_CALL_DURATION_MS = 24 * 60 * 60 * 1000
const FUTURE_CALL_SKEW_MS = 5 * 60 * 1000

@Injectable()
export class CallRecordService {
  private readonly logger = new Logger(CallRecordService.name)

  constructor(
    @InjectRepository(CallRecord)
    private readonly callRecordRepository: Repository<CallRecord>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectQueue('call-summary')
    private readonly callSummaryQueue: Queue<CallSummaryJobData>,
    @InjectQueue('cloud-transcription-match')
    private readonly transcriptionMatchQueue: Queue<{ callRecordId: number }>,
  ) {}

  async create(dto: CreateCallRecordDto, user: AuthUser): Promise<CallRecord> {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    })

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`)
    }

    if (user.role === UserRole.SALES && customer.assignedUserId !== user.id) {
      throw new ForbiddenException('No permission to create a call record for this customer')
    }

    const record = this.callRecordRepository.create({
      ...dto,
      userId: user.id,
      callAt: new Date(dto.callAt),
    })
    return this.callRecordRepository.save(record)
  }

  async createNativeOutbound(
    dto: CreateNativeOutboundCallDto,
    user: AuthUser,
  ): Promise<CallRecord> {
    // 小程序可能在弱网或返回前台时重复提交，clientCallId 保证同一次拨号只落一条记录。
    const existing = await this.findExistingNativeOutbound(dto.clientCallId, user)
    if (existing) return existing

    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    })

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`)
    }

    if (user.role === UserRole.SALES && customer.assignedUserId !== user.id) {
      throw new ForbiddenException('鎮ㄦ棤鏉冧负姝ゅ鎴峰垱寤洪€氳瘽璁板綍')
    }

    // 防止客户端篡改 customerId，把通话挂到并未拨打的客户上。
    this.assertCustomerPhoneMatches(customer.phone, dto.customerPhone)

    const startedAt = new Date(dto.startedAt)
    const endedAt = new Date(dto.endedAt)
    if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(endedAt.getTime())) {
      throw new BadRequestException('Invalid call time')
    }
    if (endedAt.getTime() < startedAt.getTime()) {
      throw new BadRequestException('Call end time cannot be earlier than start time')
    }
    this.assertNativeCallTimeWindow(startedAt, endedAt)

    const duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
    const caller = await this.userRepository.findOne({ where: { id: user.id } })
    const notes = dto.notes?.trim()

    const record = this.callRecordRepository.create({
      clientCallId: dto.clientCallId,
      customerId: customer.id,
      userId: user.id,
      callAt: startedAt,
      duration,
      estimatedDuration: duration,
      callType: CallType.MANUAL,
      callResult: dto.callResult ?? null,
      notes: notes || null,
      simSlot: dto.simSlot ?? null,
      simNumber: caller?.phone ?? null,
      direction: CallDirection.OUTBOUND,
      status: CallStatus.ENDED,
    })

    let saved: CallRecord
    try {
      saved = await this.callRecordRepository.save(record)
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error
      const duplicate = await this.findExistingNativeOutbound(dto.clientCallId, user)
      if (duplicate) return duplicate
      throw error
    }
    // 云转写回调可能先到达并处于 PENDING，保存本地通话后主动触发一次反向匹配。
    await this.scheduleCloudTranscriptionMatch(saved.id)
    return saved
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

  private assertCustomerPhoneMatches(customerPhone: string | null, submittedPhone: string): void {
    const expected = this.normalizePhone(customerPhone)
    const actual = this.normalizePhone(submittedPhone)

    if (!expected || !actual || expected !== actual) {
      throw new BadRequestException('Submitted phone does not match the selected customer')
    }
  }

  private async findExistingNativeOutbound(
    clientCallId: string,
    user: AuthUser,
  ): Promise<CallRecord | null> {
    const existing = await this.callRecordRepository.findOne({ where: { clientCallId } })
    if (!existing) return null

    if (existing.userId !== user.id) {
      throw new ForbiddenException('Client call id belongs to another user')
    }

    return existing
  }

  private assertNativeCallTimeWindow(startedAt: Date, endedAt: Date): void {
    const nowWithSkew = Date.now() + FUTURE_CALL_SKEW_MS
    // 允许少量设备时钟/网络偏移，但拒绝明显未来时间和异常超长通话。
    if (startedAt.getTime() > nowWithSkew || endedAt.getTime() > nowWithSkew) {
      throw new BadRequestException('Call time cannot be in the future')
    }

    if (endedAt.getTime() - startedAt.getTime() > MAX_NATIVE_CALL_DURATION_MS) {
      throw new BadRequestException('Call duration exceeds maximum allowed duration')
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const err = error as { code?: string; errno?: number; message?: string }
    return (
      err.code === 'ER_DUP_ENTRY' ||
      err.errno === 1062 ||
      String(err.message ?? '').includes('Duplicate entry')
    )
  }

  private normalizePhone(value: string | null | undefined): string {
    const digits = String(value ?? '').replace(/\D/g, '')
    if (digits.startsWith('0086') && digits.length === 15) return digits.slice(4)
    if (digits.startsWith('86') && digits.length === 13) return digits.slice(2)
    return digits
  }

  private async scheduleCloudTranscriptionMatch(callRecordId: number): Promise<void> {
    try {
      await this.transcriptionMatchQueue.add(
        { callRecordId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
          jobId: `native-outbound-match:${callRecordId}`,
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      )
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue cloud transcription match for call record #${callRecordId}: ${String(error)}`,
      )
    }
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
