import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PkStatus, PkMetric, PkResult, OpportunityStage } from '@crm/shared'
import { RedisService } from '../../common/redis/redis.service'
import { Pk } from './pk.entity'
import { PkTeam } from './pk-team.entity'
import { PkMember } from './pk-member.entity'
import { PkBadge } from './pk-badge.entity'
import { PkBadgeService } from './pk-badge.service'
import { Opportunity } from '../opportunity/opportunity.entity'
import { Customer } from '../customer/customer.entity'
import { CallRecord } from '../call-record/call-record.entity'
import { Payment } from '../payment/entities/payment.entity'
import { CreatePkDto } from './dto/create-pk.dto'
import { QueryPkDto } from './dto/query-pk.dto'

@Injectable()
export class PkService {
  private readonly logger = new Logger(PkService.name)

  constructor(
    @InjectRepository(Pk) private readonly pkRepo: Repository<Pk>,
    @InjectRepository(PkTeam) private readonly teamRepo: Repository<PkTeam>,
    @InjectRepository(PkMember) private readonly memberRepo: Repository<PkMember>,
    @InjectRepository(PkBadge) private readonly badgeRepo: Repository<PkBadge>,
    @InjectRepository(Opportunity) private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CallRecord) private readonly callRecordRepo: Repository<CallRecord>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly redisService: RedisService,
    private readonly pkBadgeService: PkBadgeService,
  ) {}

  async create(dto: CreatePkDto, userId: number): Promise<Pk> {
    const pk = this.pkRepo.create({
      title: dto.title,
      type: dto.type,
      metric: dto.metric,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      stake: dto.stake ?? null,
      status: PkStatus.PENDING,
      createdById: userId,
    })
    const savedPk = await this.pkRepo.save(pk)

    for (const teamDto of dto.teams) {
      const team = this.teamRepo.create({
        pkId: savedPk.id,
        name: teamDto.name,
        side: teamDto.side,
      })
      const savedTeam = await this.teamRepo.save(team)

      const members = teamDto.memberIds.map((uid) =>
        this.memberRepo.create({ teamId: savedTeam.id, pkId: savedPk.id, userId: uid }),
      )
      await this.memberRepo.save(members)
    }

    return this.findOne(savedPk.id)
  }

  async findAll(
    query: QueryPkDto,
  ): Promise<{ list: Pk[]; total: number; page: number; pageSize: number }> {
    const page = parseInt(query.page ?? '1', 10) || 1
    const pageSize = parseInt(query.pageSize ?? '20', 10) || 20

    const qb = this.pkRepo
      .createQueryBuilder('pk')
      .leftJoinAndSelect('pk.teams', 'team')
      .leftJoinAndSelect('team.members', 'member')
      .orderBy('pk.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    if (query.status) {
      qb.andWhere('pk.status = :status', { status: query.status })
    }

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<Pk> {
    const pk = await this.pkRepo.findOne({
      where: { id },
      relations: ['teams', 'teams.members', 'teams.members.user', 'createdBy'],
    })
    if (!pk) throw new NotFoundException('PK not found')
    return pk
  }

  async remove(id: number): Promise<void> {
    const pk = await this.findOne(id)
    await this.pkRepo.softRemove(pk)
  }

  async start(id: number): Promise<Pk> {
    const pk = await this.findOne(id)
    if (pk.status !== PkStatus.PENDING) {
      throw new BadRequestException('Only pending PK can be started')
    }
    pk.status = PkStatus.ACTIVE
    await this.pkRepo.save(pk)
    return pk
  }

  async settle(id: number): Promise<Pk> {
    const pk = await this.findOne(id)
    if (pk.status !== PkStatus.ACTIVE) {
      throw new BadRequestException('Only active PK can be settled')
    }

    // Calculate final scores
    await this.calculateScore(id)

    // Reload after score calculation
    const updated = await this.findOne(id)
    const teamA = updated.teams.find((t) => t.side === 'A')
    const teamB = updated.teams.find((t) => t.side === 'B')

    if (!teamA || !teamB) throw new BadRequestException('Teams not found')

    const scoreA = Number(teamA.score)
    const scoreB = Number(teamB.score)

    if (scoreA > scoreB) {
      updated.result = PkResult.TEAM_A_WIN
      teamA.isWinner = true
    } else if (scoreB > scoreA) {
      updated.result = PkResult.TEAM_B_WIN
      teamB.isWinner = true
    } else {
      updated.result = PkResult.DRAW
    }

    updated.status = PkStatus.FINISHED
    await this.teamRepo.save([teamA, teamB])
    await this.pkRepo.save(updated)

    // Award badges
    try {
      await this.pkBadgeService.awardBadges(id)
    } catch (err) {
      this.logger.warn(`Badge award failed for PK ${id}: ${(err as Error).message}`)
    }

    return this.findOne(id)
  }

  async calculateScore(pkId: number): Promise<void> {
    const cacheKey = `cache:pk:score:${pkId}`
    const cached = await this.redisService.safeGet(cacheKey)
    if (cached) return

    const pk = await this.findOne(pkId)
    const startDate = pk.startDate
    const endDate = pk.endDate

    for (const team of pk.teams) {
      let teamScore = 0
      for (const member of team.members) {
        const score = await this.calculateMemberScore(member.userId, pk.metric, startDate, endDate)
        member.contribution = score
        teamScore += score
        await this.memberRepo.save(member)
      }
      team.score = teamScore
      await this.teamRepo.save(team)
    }

    await this.redisService.set(cacheKey, '1', 60)
  }

  private async calculateMemberScore(
    userId: number,
    metric: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    switch (metric) {
      case PkMetric.REVENUE: {
        const result = await this.opportunityRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.amount), 0)', 'total')
          .where('o.assignedUserId = :userId', { userId })
          .andWhere('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
          .andWhere('o.updatedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
          .getRawOne()
        return Number(result?.total ?? 0)
      }
      case PkMetric.DEAL_COUNT: {
        const count = await this.opportunityRepo
          .createQueryBuilder('o')
          .where('o.assignedUserId = :userId', { userId })
          .andWhere('o.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
          .andWhere('o.updatedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
          .getCount()
        return count
      }
      case PkMetric.CALL_COUNT: {
        const count = await this.callRecordRepo
          .createQueryBuilder('c')
          .where('c.userId = :userId', { userId })
          .andWhere('c.callAt BETWEEN :startDate AND :endDate', { startDate, endDate })
          .getCount()
        return count
      }
      case PkMetric.NEW_CUSTOMER: {
        const count = await this.customerRepo
          .createQueryBuilder('cu')
          .where('cu.assignedUserId = :userId', { userId })
          .andWhere('cu.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
          .getCount()
        return count
      }
      case PkMetric.COLLECTION: {
        const result = await this.paymentRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.actualAmount), 0)', 'total')
          .where('p.ownerId = :userId', { userId })
          .andWhere('p.status = :status', { status: 'confirmed' })
          .andWhere('p.actualDate BETWEEN :startDate AND :endDate', { startDate, endDate })
          .getRawOne()
        return Number(result?.total ?? 0)
      }
      default:
        return 0
    }
  }

  async getRanking(pkId: number): Promise<PkMember[]> {
    return this.memberRepo.find({
      where: { pkId },
      relations: ['user', 'team'],
      order: { contribution: 'DESC' },
    })
  }

  async getMyStats(
    userId: number,
  ): Promise<{ wins: number; losses: number; draws: number; total: number }> {
    const allMemberships = await this.memberRepo.find({
      where: { userId },
      relations: ['team', 'team.pk'],
    })

    let wins = 0
    let losses = 0
    let draws = 0

    for (const m of allMemberships) {
      if (m.team?.pk?.status !== PkStatus.FINISHED) continue
      if (m.team.pk.result === PkResult.DRAW) {
        draws++
      } else if (m.team.isWinner) {
        wins++
      } else {
        losses++
      }
    }

    return { wins, losses, draws, total: wins + losses + draws }
  }

  async getHistory(
    query: QueryPkDto,
  ): Promise<{ list: Pk[]; total: number; page: number; pageSize: number }> {
    const page = parseInt(query.page ?? '1', 10) || 1
    const pageSize = parseInt(query.pageSize ?? '20', 10) || 20

    const [list, total] = await this.pkRepo.findAndCount({
      where: { status: PkStatus.FINISHED },
      relations: ['teams', 'teams.members'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return { list, total, page, pageSize }
  }

  async getScore(pkId: number): Promise<Pk> {
    await this.calculateScore(pkId)
    return this.findOne(pkId)
  }
}
