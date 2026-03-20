import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PkBadge } from './pk-badge.entity'
import { PkMember } from './pk-member.entity'
import { PkTeam } from './pk-team.entity'
import { Pk } from './pk.entity'

@Injectable()
export class PkBadgeService {
  constructor(
    @InjectRepository(PkBadge) private readonly badgeRepo: Repository<PkBadge>,
    @InjectRepository(Pk) private readonly pkRepo: Repository<Pk>,
    @InjectRepository(PkTeam) private readonly teamRepo: Repository<PkTeam>,
    @InjectRepository(PkMember) private readonly memberRepo: Repository<PkMember>,
  ) {}

  async awardBadges(pkId: number): Promise<PkBadge[]> {
    const pk = await this.pkRepo.findOne({
      where: { id: pkId },
      relations: ['teams', 'teams.members'],
    })
    if (!pk) throw new NotFoundException('PK not found')

    const winningTeam = pk.teams.find((t) => t.isWinner)
    if (!winningTeam) return []

    const badges: PkBadge[] = []

    // Award first_win badges
    for (const member of winningTeam.members) {
      const existingWin = await this.badgeRepo.findOne({
        where: { userId: member.userId, type: 'first_win' },
      })
      if (!existingWin) {
        const badge = this.badgeRepo.create({ userId: member.userId, type: 'first_win', pkId })
        badges.push(badge)
      }
    }

    // MVP badge — highest contribution in the PK
    const allMembers = await this.memberRepo.find({ where: { pkId } })
    if (allMembers.length > 0) {
      const mvp = allMembers.reduce(
        (best, m) => (Number(m.contribution) > Number(best.contribution) ? m : best),
        allMembers[0],
      )
      if (Number(mvp.contribution) > 0) {
        const badge = this.badgeRepo.create({ userId: mvp.userId, type: 'mvp', pkId })
        badges.push(badge)
      }
    }

    // Streak detection for winning team members
    for (const member of winningTeam.members) {
      const winCount = await this.getConsecutiveWins(member.userId, pkId)
      if (winCount >= 5) {
        const existing5 = await this.badgeRepo.findOne({
          where: { userId: member.userId, type: 'streak_5', pkId },
        })
        if (!existing5) {
          badges.push(this.badgeRepo.create({ userId: member.userId, type: 'streak_5', pkId }))
        }
      } else if (winCount >= 3) {
        const existing3 = await this.badgeRepo.findOne({
          where: { userId: member.userId, type: 'streak_3', pkId },
        })
        if (!existing3) {
          badges.push(this.badgeRepo.create({ userId: member.userId, type: 'streak_3', pkId }))
        }
      }
    }

    if (badges.length > 0) {
      await this.badgeRepo.save(badges)
    }

    return badges
  }

  private async getConsecutiveWins(userId: number, _currentPkId: number): Promise<number> {
    // Find all finished PKs where this user was a winning team member, ordered by end date desc
    const winningPks = await this.memberRepo
      .createQueryBuilder('m')
      .innerJoin('m.team', 't')
      .innerJoin('t.pk', 'p')
      .where('m.userId = :userId', { userId })
      .andWhere('t.isWinner = true')
      .andWhere('p.status = :status', { status: 'finished' })
      .orderBy('p.endDate', 'DESC')
      .getMany()

    return winningPks.length
  }

  async getUserBadges(userId: number): Promise<PkBadge[]> {
    return this.badgeRepo.find({ where: { userId }, order: { createdAt: 'DESC' } })
  }
}
