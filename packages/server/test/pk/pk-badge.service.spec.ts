import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PkBadgeService } from '../../src/modules/pk/pk-badge.service'
import { PkBadge } from '../../src/modules/pk/pk-badge.entity'
import { Pk } from '../../src/modules/pk/pk.entity'
import { PkTeam } from '../../src/modules/pk/pk-team.entity'
import { PkMember } from '../../src/modules/pk/pk-member.entity'
import { createMockRepository, createMockQueryBuilder } from '../test-utils'
import type { MockRepository } from '../test-utils'
import { PkStatus } from '@crm/shared'

describe('PkBadgeService', () => {
  let service: PkBadgeService
  let badgeRepo: MockRepository
  let pkRepo: MockRepository
  let teamRepo: MockRepository
  let memberRepo: MockRepository

  beforeEach(async () => {
    badgeRepo = createMockRepository()
    pkRepo = createMockRepository()
    teamRepo = createMockRepository()
    memberRepo = createMockRepository()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PkBadgeService,
        { provide: getRepositoryToken(PkBadge), useValue: badgeRepo },
        { provide: getRepositoryToken(Pk), useValue: pkRepo },
        { provide: getRepositoryToken(PkTeam), useValue: teamRepo },
        { provide: getRepositoryToken(PkMember), useValue: memberRepo },
      ],
    }).compile()

    service = module.get<PkBadgeService>(PkBadgeService)
  })

  describe('awardBadges', () => {
    it('should return empty if PK not found', async () => {
      pkRepo.findOne.mockResolvedValue(null)
      await expect(service.awardBadges(1)).rejects.toThrow()
    })

    it('should return empty if no winning team', async () => {
      pkRepo.findOne.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, side: 'A', isWinner: false, members: [] },
          { id: 2, side: 'B', isWinner: false, members: [] },
        ],
      })
      const result = await service.awardBadges(1)
      expect(result).toEqual([])
    })

    it('should award first_win badge to winning team members', async () => {
      pkRepo.findOne.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, side: 'A', isWinner: true, members: [{ userId: 1, contribution: 100 }] },
          { id: 2, side: 'B', isWinner: false, members: [{ userId: 2, contribution: 50 }] },
        ],
      })
      badgeRepo.findOne.mockResolvedValue(null) // no existing first_win
      badgeRepo.create.mockImplementation((data: Record<string, unknown>) => data)
      memberRepo.find.mockResolvedValue([
        { userId: 1, contribution: 100 },
        { userId: 2, contribution: 50 },
      ])

      // Mock streak detection
      const qb = createMockQueryBuilder()
      qb.getMany.mockResolvedValue([{ pkId: 1 }])
      memberRepo.createQueryBuilder.mockReturnValue(qb)

      badgeRepo.save.mockResolvedValue([])

      const result = await service.awardBadges(1)
      expect(result.length).toBeGreaterThan(0)
      expect(badgeRepo.save).toHaveBeenCalled()
    })

    it('should award MVP badge to highest contributor', async () => {
      pkRepo.findOne.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, side: 'A', isWinner: true, members: [{ userId: 1, contribution: 200 }] },
          { id: 2, side: 'B', isWinner: false, members: [] },
        ],
      })
      badgeRepo.findOne.mockResolvedValue(null)
      badgeRepo.create.mockImplementation((data: Record<string, unknown>) => data)
      memberRepo.find.mockResolvedValue([
        { userId: 1, contribution: 200 },
        { userId: 2, contribution: 50 },
      ])
      const qb = createMockQueryBuilder()
      qb.getMany.mockResolvedValue([])
      memberRepo.createQueryBuilder.mockReturnValue(qb)
      badgeRepo.save.mockResolvedValue([])

      const result = await service.awardBadges(1)
      const mvpBadge = result.find((b) => (b as unknown as Record<string, unknown>).type === 'mvp')
      expect(mvpBadge).toBeDefined()
    })
  })

  describe('getUserBadges', () => {
    it('should return badges for user', async () => {
      badgeRepo.find.mockResolvedValue([{ id: 1, type: 'first_win', userId: 1 }])
      const result = await service.getUserBadges(1)
      expect(result).toHaveLength(1)
    })

    it('should return empty array for user with no badges', async () => {
      badgeRepo.find.mockResolvedValue([])
      const result = await service.getUserBadges(1)
      expect(result).toEqual([])
    })
  })
})
