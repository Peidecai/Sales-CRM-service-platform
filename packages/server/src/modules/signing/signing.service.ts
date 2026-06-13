import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SigningProcess } from './entities/signing-process.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { CreateSigningProcessDto } from './dto/create-signing-process.dto'
import { UpdateSigningStatusDto } from './dto/update-signing-status.dto'
import { SigningQueryDto } from './dto/signing-query.dto'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@crm/shared'

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['internal_review', 'cancelled'],
  internal_review: ['sent_to_customer', 'draft', 'cancelled'],
  sent_to_customer: ['customer_signed', 'cancelled'],
  customer_signed: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],
}

@Injectable()
export class SigningService {
  constructor(
    @InjectRepository(SigningProcess)
    private readonly signingRepo: Repository<SigningProcess>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepo: Repository<Opportunity>,
  ) {}

  async create(dto: CreateSigningProcessDto, user: AuthUser): Promise<SigningProcess> {
    const opp = await this.opportunityRepo.findOne({ where: { id: dto.opportunityId } })
    if (!opp) throw new NotFoundException(`商机 #${dto.opportunityId} 不存在`)

    const signing = this.signingRepo.create({
      opportunityId: dto.opportunityId,
      amount: dto.amount,
      status: 'draft',
      salesUserId: user.id,
    })
    return this.signingRepo.save(signing)
  }

  async findAll(query: SigningQueryDto, user: AuthUser) {
    const qb = this.signingRepo.createQueryBuilder('sp').leftJoinAndSelect('sp.opportunity', 'opp')

    if (user.role === UserRole.SALES) {
      qb.andWhere('sp.salesUserId = :uid', { uid: user.id })
    }
    if (query.status) qb.andWhere('sp.status = :status', { status: query.status })
    if (query.salesUserId) qb.andWhere('sp.salesUserId = :sid', { sid: query.salesUserId })
    if (query.startDate) qb.andWhere('sp.createdAt >= :start', { start: query.startDate })
    if (query.endDate) qb.andWhere('sp.createdAt <= :end', { end: query.endDate })

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    qb.orderBy('sp.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number, user: AuthUser): Promise<SigningProcess> {
    const sp = await this.signingRepo.findOne({
      where: { id },
      relations: ['opportunity', 'contract'],
    })
    if (!sp) throw new NotFoundException(`签约流程 #${id} 不存在`)
    if (user.role === UserRole.SALES && sp.salesUserId !== user.id) {
      throw new ForbiddenException('无权访问此签约流程')
    }
    return sp
  }

  async updateStatus(
    id: number,
    dto: UpdateSigningStatusDto,
    user: AuthUser,
  ): Promise<SigningProcess> {
    const sp = await this.findOne(id, user)
    const allowed = STATUS_TRANSITIONS[sp.status] ?? []
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`不允许从 ${sp.status} 转换到 ${dto.status}`)
    }

    sp.status = dto.status
    if (dto.externalSignId) sp.externalSignId = dto.externalSignId

    const now = new Date()
    if (dto.status === 'sent_to_customer') sp.sentAt = now
    if (dto.status === 'customer_signed') sp.signedAt = now
    if (dto.status === 'completed') sp.completedAt = now

    return this.signingRepo.save(sp)
  }

  async getStatistics(startDate?: string, endDate?: string) {
    const qb = this.signingRepo.createQueryBuilder('sp')

    if (startDate) qb.andWhere('sp.createdAt >= :start', { start: startDate })
    if (endDate) qb.andWhere('sp.createdAt <= :end', { end: endDate })

    const total = await qb.getCount()

    const completed = await qb.clone().andWhere('sp.status = :s', { s: 'completed' }).getCount()
    const avgCycleResult = await qb
      .clone()
      .andWhere('sp.completedAt IS NOT NULL')
      .select('AVG(DATEDIFF(sp.completedAt, sp.createdAt))', 'avgDays')
      .getRawOne()

    const amountResult = await qb
      .clone()
      .andWhere('sp.status = :s', { s: 'completed' })
      .select('SUM(sp.amount)', 'totalAmount')
      .getRawOne()

    return {
      total,
      completed,
      conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgCycleDays: Number(avgCycleResult?.avgDays ?? 0),
      totalAmount: Number(amountResult?.totalAmount ?? 0),
    }
  }

  async getRanking(period: string = 'month', limit: number = 10) {
    const qb = this.signingRepo
      .createQueryBuilder('sp')
      .andWhere('sp.status = :s', { s: 'completed' })

    const now = new Date()
    if (period === 'day') {
      qb.andWhere('DATE(sp.completedAt) = CURDATE()')
    } else if (period === 'week') {
      qb.andWhere('sp.completedAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
    } else {
      qb.andWhere('YEAR(sp.completedAt) = :y AND MONTH(sp.completedAt) = :m', {
        y: now.getFullYear(),
        m: now.getMonth() + 1,
      })
    }

    return qb
      .select('sp.salesUserId', 'salesUserId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(sp.amount)', 'totalAmount')
      .groupBy('sp.salesUserId')
      .orderBy('totalAmount', 'DESC')
      .limit(limit)
      .getRawMany()
  }
}
