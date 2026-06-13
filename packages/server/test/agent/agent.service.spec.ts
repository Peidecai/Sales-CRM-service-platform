import { NotFoundException, BadRequestException } from '@nestjs/common'
import { UserRole } from '@crm/shared'
import { AgentService } from '../../src/modules/agent/agent.service'
import { AgentStatusService, AgentStatus } from '../../src/modules/agent/agent-status.service'
import { CallDistributionService } from '../../src/modules/agent/call-distribution.service'
import {
  createMockRepository,
  createMockRedisService,
  createMockQueryBuilder,
  type MockRepository,
  type MockRedisService,
  type MockQueryBuilder,
} from '../test-utils'

/* ================================================================
 *  AgentStatusService
 * ================================================================ */
describe('AgentStatusService', () => {
  let service: AgentStatusService
  let statusLogRepo: MockRepository
  let redis: MockRedisService

  beforeEach(() => {
    statusLogRepo = createMockRepository()
    redis = createMockRedisService()
    service = new AgentStatusService(statusLogRepo as never, redis as never)
  })

  describe('getStatus', () => {
    it('should return status from Redis when valid', async () => {
      redis.get.mockResolvedValue(AgentStatus.IDLE)
      const result = await service.getStatus(1)
      expect(result).toBe(AgentStatus.IDLE)
      expect(redis.get).toHaveBeenCalledWith('agent:status:1')
    })

    it('should return OFFLINE when Redis has no value', async () => {
      redis.get.mockResolvedValue(null)
      const result = await service.getStatus(1)
      expect(result).toBe(AgentStatus.OFFLINE)
    })

    it('should return OFFLINE when Redis has invalid value', async () => {
      redis.get.mockResolvedValue('INVALID_STATUS')
      const result = await service.getStatus(1)
      expect(result).toBe(AgentStatus.OFFLINE)
    })
  })

  describe('transition', () => {
    it('should allow valid OFFLINE → IDLE transition', async () => {
      redis.get.mockResolvedValue(null) // OFFLINE
      statusLogRepo.create.mockReturnValue({ agentId: 1, fromStatus: AgentStatus.OFFLINE, toStatus: AgentStatus.IDLE })
      statusLogRepo.save.mockResolvedValue({})

      await service.transition(1, AgentStatus.IDLE, 'login')

      expect(redis.set).toHaveBeenCalledWith('agent:status:1', AgentStatus.IDLE)
      expect(statusLogRepo.create).toHaveBeenCalledWith({
        agentId: 1,
        fromStatus: AgentStatus.OFFLINE,
        toStatus: AgentStatus.IDLE,
        reason: 'login',
      })
      expect(statusLogRepo.save).toHaveBeenCalled()
    })

    it('should throw on invalid transition OFFLINE → ON_CALL', async () => {
      redis.get.mockResolvedValue(null)
      await expect(service.transition(1, AgentStatus.ON_CALL)).rejects.toThrow(BadRequestException)
    })

    it('should add to WRAP_UP ZSET when transitioning to WRAP_UP', async () => {
      redis.get.mockResolvedValue(AgentStatus.ON_CALL)
      statusLogRepo.create.mockReturnValue({})
      statusLogRepo.save.mockResolvedValue({})

      await service.transition(1, AgentStatus.WRAP_UP)

      expect(redis.zAdd).toHaveBeenCalledWith(
        'agent:wrap_up_set',
        expect.any(Number),
        '1',
      )
    })

    it('should remove from WRAP_UP ZSET when leaving WRAP_UP', async () => {
      redis.get.mockResolvedValue(AgentStatus.WRAP_UP)
      statusLogRepo.create.mockReturnValue({})
      statusLogRepo.save.mockResolvedValue({})

      await service.transition(1, AgentStatus.IDLE)

      expect(redis.zRem).toHaveBeenCalledWith('agent:wrap_up_set', '1')
    })
  })

  describe('getWrapUpOverdueAgentIds', () => {
    it('should return agent IDs that entered WRAP_UP over 120s ago', async () => {
      redis.zRangeByScore.mockResolvedValue(['10', '20'])

      const result = await service.getWrapUpOverdueAgentIds()

      expect(result).toEqual([10, 20])
      expect(redis.zRangeByScore).toHaveBeenCalledWith(
        'agent:wrap_up_set',
        0,
        expect.any(Number),
      )
    })

    it('should filter out NaN members', async () => {
      redis.zRangeByScore.mockResolvedValue(['10', 'bad', '30'])
      const result = await service.getWrapUpOverdueAgentIds()
      expect(result).toEqual([10, 30])
    })
  })
})

/* ================================================================
 *  AgentService
 * ================================================================ */
describe('AgentService', () => {
  let service: AgentService
  let userRepo: MockRepository
  let statusLogRepo: MockRepository
  let agentStatusSvc: { getStatus: jest.Mock }
  let redis: MockRedisService

  beforeEach(() => {
    userRepo = createMockRepository()
    statusLogRepo = createMockRepository()
    agentStatusSvc = { getStatus: jest.fn() }
    redis = createMockRedisService()

    service = new AgentService(
      userRepo as never,
      statusLogRepo as never,
      agentStatusSvc as never,
      redis as never,
    )
  })

  describe('list', () => {
    it('should return agents with batch-fetched statuses', async () => {
      const users = [
        { id: 1, name: 'Agent A', username: 'a', role: UserRole.SALES },
        { id: 2, name: 'Agent B', username: 'b', role: UserRole.SALES },
      ]
      const qb = createMockQueryBuilder(users)
      userRepo.createQueryBuilder.mockReturnValue(qb)

      const mockClient = { mget: jest.fn().mockResolvedValue([AgentStatus.IDLE, null]) }
      redis.getClient.mockReturnValue(mockClient)

      const result = await service.list(UserRole.ADMIN, 1)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 1, status: AgentStatus.IDLE })
      expect(result[1]).toMatchObject({ id: 2, status: AgentStatus.OFFLINE })
    })

    it('should restrict SALES users to own records', async () => {
      const qb = createMockQueryBuilder([])
      userRepo.createQueryBuilder.mockReturnValue(qb)
      const mockClient = { mget: jest.fn().mockResolvedValue([]) }
      redis.getClient.mockReturnValue(mockClient)

      await service.list(UserRole.SALES, 5)

      // SALES triggers andWhere with uid
      expect(qb.andWhere).toHaveBeenCalledWith('u.id = :uid', { uid: 5 })
    })

    it('should filter by status when provided', async () => {
      const users = [{ id: 1, name: 'A', username: 'a', role: UserRole.SALES }]
      const qb = createMockQueryBuilder(users)
      userRepo.createQueryBuilder.mockReturnValue(qb)

      const mockClient = { mget: jest.fn().mockResolvedValue([AgentStatus.BUSY]) }
      redis.getClient.mockReturnValue(mockClient)

      const result = await service.list(UserRole.ADMIN, 1, AgentStatus.IDLE)
      // BUSY !== IDLE, so filtered out
      expect(result).toHaveLength(0)
    })

    it('should return empty array when no users found', async () => {
      const qb = createMockQueryBuilder([])
      userRepo.createQueryBuilder.mockReturnValue(qb)
      const result = await service.list(UserRole.ADMIN, 1)
      expect(result).toEqual([])
    })
  })

  describe('getOne', () => {
    it('should return agent with status', async () => {
      const user = { id: 1, name: 'Agent', username: 'agent1', role: UserRole.SALES, phone: '138' }
      userRepo.findOne.mockResolvedValue(user)
      agentStatusSvc.getStatus.mockResolvedValue(AgentStatus.IDLE)

      const result = await service.getOne(1)

      expect(result).toMatchObject({ ...user, status: AgentStatus.IDLE })
      expect(agentStatusSvc.getStatus).toHaveBeenCalledWith(1)
    })

    it('should throw NotFoundException when agent not found', async () => {
      userRepo.findOne.mockResolvedValue(null)
      await expect(service.getOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('available', () => {
    it('should return only IDLE agents via batch MGET', async () => {
      const users = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
      ]
      userRepo.find.mockResolvedValue(users)

      const mockClient = { mget: jest.fn().mockResolvedValue([AgentStatus.IDLE, AgentStatus.BUSY, null]) }
      redis.getClient.mockReturnValue(mockClient)

      const result = await service.available()

      // Only agent 1 is IDLE
      expect(result).toEqual([{ id: 1, name: 'A' }])
    })

    it('should return empty when no active users', async () => {
      userRepo.find.mockResolvedValue([])
      const result = await service.available()
      expect(result).toEqual([])
    })
  })

  describe('getStats', () => {
    it('should return call count for agent', async () => {
      statusLogRepo.count.mockResolvedValue(5)
      const result = await service.getStats(1)
      expect(result).toEqual({ agentId: 1, todayCallCount: 5, totalCallCount: 5 })
      expect(statusLogRepo.count).toHaveBeenCalledWith({
        where: { agentId: 1, toStatus: AgentStatus.ON_CALL },
      })
    })
  })

  describe('statusLogs', () => {
    it('should return logs with date filters', async () => {
      const logs = [{ id: 1, agentId: 1, fromStatus: 'IDLE', toStatus: 'BUSY' }]
      const qb = createMockQueryBuilder(logs)
      statusLogRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.statusLogs(1, '2025-01-01', '2025-01-31')

      expect(qb.where).toHaveBeenCalledWith('l.agentId = :agentId', { agentId: 1 })
      expect(qb.andWhere).toHaveBeenCalledWith('l.createdAt >= :startDate', { startDate: expect.any(Date) })
      expect(qb.andWhere).toHaveBeenCalledWith('l.createdAt <= :endDate', { endDate: expect.any(Date) })
      expect(result).toEqual(logs)
    })
  })
})

/* ================================================================
 *  CallDistributionService
 * ================================================================ */
describe('CallDistributionService', () => {
  let service: CallDistributionService
  let statusLogRepo: MockRepository
  let userRepo: MockRepository
  let redis: MockRedisService

  beforeEach(() => {
    statusLogRepo = createMockRepository()
    userRepo = createMockRepository()
    redis = createMockRedisService()

    service = new CallDistributionService(
      statusLogRepo as never,
      userRepo as never,
      redis as never,
    )
  })

  describe('selectAgent — round_robin', () => {
    it('should cycle through agents', async () => {
      redis.get.mockResolvedValue('1') // last assigned index = 1
      const result = await service.selectAgent([10, 20, 30], 'round_robin')
      // next = (1+1) % 3 = 2 → ids[2] = 30
      expect(result).toBe(30)
      expect(redis.set).toHaveBeenCalledWith('agent:last_assigned_index', '2')
    })

    it('should wrap around to first agent', async () => {
      redis.get.mockResolvedValue('2') // last index = 2, agents length = 3
      const result = await service.selectAgent([10, 20, 30], 'round_robin')
      // next = (2+1) % 3 = 0 → ids[0] = 10
      expect(result).toBe(10)
    })

    it('should return null for empty agents', async () => {
      const result = await service.selectAgent([], 'round_robin')
      expect(result).toBeNull()
    })
  })

  describe('selectAgent — least_calls', () => {
    it('should select agent with fewest today calls', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([
        { agentId: 10, cnt: '5' },
        { agentId: 20, cnt: '2' },
      ])
      statusLogRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.selectAgent([10, 20, 30], 'least_calls')

      // Agent 30 has 0 calls (not in result), agent 20 has 2 → agent 30 wins
      expect(result).toBe(30)
    })

    it('should return single agent directly', async () => {
      const result = await service.selectAgent([42], 'least_calls')
      expect(result).toBe(42)
    })
  })

  describe('selectAgent — skill_based', () => {
    it('should select skill-matched agent with fewest calls', async () => {
      userRepo.find.mockResolvedValue([
        { id: 10, skills: [1, 2, 3] },
        { id: 20, skills: [1] },
        { id: 30, skills: null },
      ])

      // For leastCalls on matched [10]:
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      statusLogRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.selectAgent([10, 20, 30], 'skill_based', {
        skillIds: [1, 2],
      })

      // Only agent 10 has both skills [1,2]
      expect(result).toBe(10)
    })

    it('should fallback to least_calls when no skill match', async () => {
      userRepo.find.mockResolvedValue([
        { id: 10, skills: [1] },
        { id: 20, skills: [1] },
      ])

      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([{ agentId: 10, cnt: '3' }, { agentId: 20, cnt: '1' }])
      statusLogRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.selectAgent([10, 20], 'skill_based', {
        skillIds: [99], // no one has skill 99
      })

      // Fallback: least_calls → agent 20 (1 call vs 3)
      expect(result).toBe(20)
    })

    it('should delegate to least_calls when no skillIds provided', async () => {
      const qb = createMockQueryBuilder()
      qb.getRawMany.mockResolvedValue([])
      statusLogRepo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.selectAgent([10, 20], 'skill_based', {
        skillIds: [],
      })

      // No skillIds → leastCalls([10,20]) → both have 0 calls, first wins
      expect(result).toBe(10)
    })
  })
})
