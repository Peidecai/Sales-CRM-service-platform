import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { UserService } from '../../src/modules/user/user.service'
import { User } from '../../src/modules/user/user.entity'
import { UserRole } from '@crm/shared'
import {
  createMockRepository,
  createMockQueryBuilder,
  fixtures,
  type MockRepository,
  type MockQueryBuilder,
} from '../test-utils'

describe('UserService', () => {
  let service: UserService
  let repo: MockRepository<User>

  beforeEach(async () => {
    repo = createMockRepository<User>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- create ---------- */
  describe('create', () => {
    const dto = {
      username: 'newuser',
      password: 'secret123',
      name: 'New User',
      email: 'new@test.com',
      role: UserRole.SALES,
    }

    it('should hash password and save a new user', async () => {
      repo.findOne.mockResolvedValue(null) // no duplicate
      const saved = fixtures.user({ ...dto, id: 3, password: 'hashed' })
      repo.create.mockReturnValue(saved)
      repo.save.mockResolvedValue(saved)

      const result = await service.create(dto as never)

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { username: dto.username },
      })
      expect(repo.create).toHaveBeenCalled()
      // password should have been hashed (bcrypt hash starts with $2a$)
      const createArg = repo.create.mock.calls[0][0] as Record<string, unknown>
      expect(createArg.password).not.toBe(dto.password)
      expect(typeof createArg.password).toBe('string')
      // returned user should not contain password
      expect(result).not.toHaveProperty('password')
    })

    it('should throw ConflictException if username already exists', async () => {
      repo.findOne.mockResolvedValue(fixtures.user({ username: dto.username }))

      await expect(service.create(dto as never)).rejects.toThrow(ConflictException)
    })
  })

  /* ---------- findAll ---------- */
  describe('findAll', () => {
    it('should return paginated users list', async () => {
      const users = [fixtures.user(), fixtures.user({ id: 2, username: 'user2' })]
      const qb = createMockQueryBuilder(users, 2)
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await service.findAll({ page: 1, pageSize: 20 })

      expect(result.total).toBe(2)
      expect(result.list).toHaveLength(2)
      // passwords should be stripped
      result.list.forEach((u) => expect(u).not.toHaveProperty('password'))
    })

    it('should apply keyword filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, keyword: 'test' })

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('user.username LIKE'),
        { kw: '%test%' },
      )
    })

    it('should apply role filter', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({ page: 1, pageSize: 20, role: UserRole.ADMIN })

      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.ADMIN })
    })

    it('should use defaults for page and pageSize', async () => {
      const qb = createMockQueryBuilder([], 0)
      repo.createQueryBuilder.mockReturnValue(qb)

      await service.findAll({})

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })
  })

  /* ---------- findOne ---------- */
  describe('findOne', () => {
    it('should return user without password', async () => {
      const user = fixtures.user()
      repo.findOne.mockResolvedValue({ ...user })

      const result = await service.findOne(1)

      expect(result).not.toHaveProperty('password')
      expect(result.id).toBe(1)
    })

    it('should throw NotFoundException if user not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- findByUsername ---------- */
  describe('findByUsername', () => {
    it('should return user including password (for auth)', async () => {
      const user = fixtures.user()
      repo.findOne.mockResolvedValue(user)

      const result = await service.findByUsername('testuser')

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      })
      expect(result).toBeDefined()
    })

    it('should return null if user not found', async () => {
      repo.findOne.mockResolvedValue(null)

      const result = await service.findByUsername('nonexistent')
      expect(result).toBeNull()
    })
  })

  /* ---------- update ---------- */
  describe('update', () => {
    it('should update user fields', async () => {
      const user = fixtures.user()
      repo.findOne.mockResolvedValue({ ...user })
      repo.save.mockImplementation(async (u) => u)

      const result = await service.update(1, { name: 'Updated Name' } as never)

      expect(result.name).toBe('Updated Name')
      expect(result).not.toHaveProperty('password')
    })

    it('should hash password when updating password', async () => {
      const user = fixtures.user()
      repo.findOne.mockResolvedValue({ ...user })
      repo.save.mockImplementation(async (u) => u)

      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'new-hashed-pw')

      await service.update(1, { password: 'newpass123' } as never)

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12)
    })

    it('should throw NotFoundException if user not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.update(999, { name: 'X' } as never)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- remove ---------- */
  describe('remove', () => {
    it('should soft-delete user', async () => {
      const user = fixtures.user()
      repo.findOne.mockResolvedValue({ ...user })
      repo.softRemove.mockImplementation(async (u) => u)

      await service.remove(1)

      expect(repo.softRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    })

    it('should throw NotFoundException if user not found', async () => {
      repo.findOne.mockResolvedValue(null)

      await expect(service.remove(999)).rejects.toThrow(NotFoundException)
    })
  })

  /* ---------- validatePassword ---------- */
  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const hashed = await bcrypt.hash('correct', 10)
      const user = fixtures.user({ password: hashed })

      const result = await service.validatePassword(user as User, 'correct')
      expect(result).toBe(true)
    })

    it('should return false for wrong password', async () => {
      const hashed = await bcrypt.hash('correct', 10)
      const user = fixtures.user({ password: hashed })

      const result = await service.validatePassword(user as User, 'wrong')
      expect(result).toBe(false)
    })
  })
})
