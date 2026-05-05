import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuditLogService } from '../../src/modules/audit-log/audit-log.service'
import { AuditLog, AuditAction } from '../../src/modules/audit-log/audit-log.entity'
import {
  createMockRepository,
  createMockQueryBuilder,
  type MockRepository,
} from '../test-utils'

describe('AuditLogService', () => {
  let service: AuditLogService
  let repo: MockRepository<AuditLog>

  beforeEach(async () => {
    repo = createMockRepository<AuditLog>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
      ],
    }).compile()

    service = module.get<AuditLogService>(AuditLogService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- log ---------- */
  describe('log', () => {
    it('should create and save an audit log entry', async () => {
      const params = {
        userId: 1,
        username: 'admin',
        action: AuditAction.CREATE,
        resource: 'customer',
        resourceId: 42,
        after: { name: '新客户' },
        ip: '127.0.0.1',
      }
      const entry = { id: 1, ...params, before: null }
      repo.create.mockReturnValue(entry)
      repo.save.mockResolvedValue(entry)

      await service.log(params)

      expect(repo.create).toHaveBeenCalledWith({
        userId: 1,
        username: 'admin',
        action: AuditAction.CREATE,
        resource: 'customer',
        resourceId: 42,
        before: null,
        after: { name: '新客户' },
        responseData: null,
        ip: '127.0.0.1',
      })
      expect(repo.save).toHaveBeenCalledWith(entry)
    })

    it('should default resourceId to 0 and ip to empty', async () => {
      const params = {
        userId: 1,
        username: 'admin',
        action: AuditAction.DELETE,
        resource: 'opportunity',
      }
      const entry = { id: 1, ...params }
      repo.create.mockReturnValue(entry)
      repo.save.mockResolvedValue(entry)

      await service.log(params)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        resourceId: 0,
        ip: '',
        before: null,
        after: null,
      }))
    })

    it('should pass before snapshot for UPDATE action', async () => {
      const params = {
        userId: 2,
        username: 'manager',
        action: AuditAction.UPDATE,
        resource: 'customer',
        resourceId: 10,
        before: { name: '旧名称' },
        after: { name: '新名称' },
        ip: '192.168.1.1',
      }
      const entry = { id: 2, ...params }
      repo.create.mockReturnValue(entry)
      repo.save.mockResolvedValue(entry)

      await service.log(params)

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        before: { name: '旧名称' },
        after: { name: '新名称' },
      }))
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return paginated list with default page and pageSize', async () => {
      const logs = [
        { id: 1, userId: 1, username: 'admin', action: AuditAction.CREATE, resource: 'customer', resourceId: 1 },
      ]
      const qb = createMockQueryBuilder(logs, 1)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({})

      expect(result.list).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(qb.skip).toHaveBeenCalledWith(0) // (1-1) * 20
      expect(qb.take).toHaveBeenCalledWith(20)
    })

    it('should paginate correctly', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 3, pageSize: 10 })

      expect(qb.skip).toHaveBeenCalledWith(20)
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(result.page).toBe(3)
      expect(result.pageSize).toBe(10)
    })

    it('should filter by userId', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ userId: 5 })

      expect(qb.andWhere).toHaveBeenCalledWith(
        'log.user_id = :userId',
        { userId: 5 },
      )
    })

    it('should filter by resource', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ resource: 'customer' })

      expect(qb.andWhere).toHaveBeenCalledWith(
        'log.resource = :resource',
        { resource: 'customer' },
      )
    })

    it('should filter by action', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ action: AuditAction.DELETE })

      expect(qb.andWhere).toHaveBeenCalledWith(
        'log.action = :action',
        { action: AuditAction.DELETE },
      )
    })

    it('should combine multiple filters', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ userId: 1, resource: 'opportunity', action: AuditAction.UPDATE })

      expect(qb.andWhere).toHaveBeenCalledTimes(3)
    })

    it('should order by createdAt DESC', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({})

      expect(qb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC')
    })
  })
})
