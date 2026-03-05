import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException, BadRequestException } from '@nestjs/common'
import { AuthService } from '../../src/modules/auth/auth.service'
import { UserService } from '../../src/modules/user/user.service'
import { RedisService } from '../../src/common/redis'
import { UserRole } from '@crm/shared'
import {
  createMockRedisService,
  createMockJwtService,
  createMockConfigService,
  fixtures,
  type MockRedisService,
  type MockJwtService,
} from '../test-utils'

describe('AuthService', () => {
  let service: AuthService
  let userService: {
    findByUsername: jest.Mock
    findOne: jest.Mock
    validatePassword: jest.Mock
    update: jest.Mock
  }
  let jwtService: MockJwtService
  let redisService: MockRedisService
  let configService: { get: jest.Mock }

  beforeEach(async () => {
    userService = {
      findByUsername: jest.fn(),
      findOne: jest.fn(),
      validatePassword: jest.fn(),
      update: jest.fn(),
    }
    jwtService = createMockJwtService()
    redisService = createMockRedisService()
    configService = createMockConfigService()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- login ---------- */
  describe('login', () => {
    const loginDto = { username: 'testuser', password: 'secret123' }

    it('should return tokens on successful login', async () => {
      const user = fixtures.user()
      userService.findByUsername.mockResolvedValue(user)
      userService.validatePassword.mockResolvedValue(true)
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

      const result = await service.login(loginDto)

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
      expect(result.user.id).toBe(user.id)
      expect(result.user.username).toBe(user.username)
    })

    it('should throw UnauthorizedException if user not found', async () => {
      userService.findByUsername.mockResolvedValue(null)

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if user is inactive', async () => {
      userService.findByUsername.mockResolvedValue(fixtures.user({ isActive: false }))

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if password is wrong', async () => {
      userService.findByUsername.mockResolvedValue(fixtures.user())
      userService.validatePassword.mockResolvedValue(false)

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })
  })

  /* ---------- refreshToken ---------- */
  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const user = fixtures.user()
      jwtService.verify.mockReturnValue({ sub: user.id, username: user.username, role: user.role })
      userService.findByUsername.mockResolvedValue(user)
      jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh')

      const result = await service.refreshToken('valid-refresh-token')

      expect(result.accessToken).toBe('new-access')
      expect(result.refreshToken).toBe('new-refresh')
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      })
    })

    it('should throw if user is inactive', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, username: 'test', role: 'sales' })
      userService.findByUsername.mockResolvedValue(fixtures.user({ isActive: false }))

      await expect(service.refreshToken('some-token')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw if user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, username: 'gone', role: 'sales' })
      userService.findByUsername.mockResolvedValue(null)

      await expect(service.refreshToken('some-token')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw if token is invalid', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid') })

      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException)
    })
  })

  /* ---------- getProfile ---------- */
  describe('getProfile', () => {
    it('should delegate to userService.findOne', async () => {
      const user = fixtures.user()
      userService.findOne.mockResolvedValue(user)

      const result = await service.getProfile(1)

      expect(userService.findOne).toHaveBeenCalledWith(1)
      expect(result).toBe(user)
    })
  })

  /* ---------- updateProfile ---------- */
  describe('updateProfile', () => {
    it('should delegate to userService.update', async () => {
      const updated = fixtures.user({ name: 'New Name' })
      userService.update.mockResolvedValue(updated)

      const result = await service.updateProfile(1, { name: 'New Name' })

      expect(userService.update).toHaveBeenCalledWith(1, { name: 'New Name' })
      expect(result.name).toBe('New Name')
    })
  })

  /* ---------- changePassword ---------- */
  describe('changePassword', () => {
    const dto = { oldPassword: 'oldpass', newPassword: 'newpass123' }

    it('should change password when old password is correct', async () => {
      const user = fixtures.user()
      userService.findOne.mockResolvedValue({ ...user })
      userService.findByUsername.mockResolvedValue(user)
      userService.validatePassword.mockResolvedValue(true)
      userService.update.mockResolvedValue(undefined)

      const result = await service.changePassword(1, dto)

      expect(result).toBeNull()
      expect(userService.update).toHaveBeenCalledWith(1, { password: 'newpass123' })
    })

    it('should throw BadRequestException if old password is wrong', async () => {
      const user = fixtures.user()
      userService.findOne.mockResolvedValue({ ...user })
      userService.findByUsername.mockResolvedValue(user)
      userService.validatePassword.mockResolvedValue(false)

      await expect(service.changePassword(1, dto)).rejects.toThrow(BadRequestException)
    })

    it('should throw UnauthorizedException if user not found', async () => {
      const user = fixtures.user()
      userService.findOne.mockResolvedValue({ ...user })
      userService.findByUsername.mockResolvedValue(null)

      await expect(service.changePassword(1, dto)).rejects.toThrow(UnauthorizedException)
    })
  })

  /* ---------- logout ---------- */
  describe('logout', () => {
    it('should blacklist token in Redis with remaining TTL', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      jwtService.verify.mockReturnValue({ sub: 1, exp: futureExp })

      await service.logout('some-access-token')

      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:blacklist:some-access-token'),
        '1',
        expect.any(Number),
      )
      // TTL should be positive and roughly 3600
      const ttlArg = redisService.set.mock.calls[0][2] as number
      expect(ttlArg).toBeGreaterThan(0)
      expect(ttlArg).toBeLessThanOrEqual(3600)
    })

    it('should not blacklist if token is already expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 10
      jwtService.verify.mockReturnValue({ sub: 1, exp: pastExp })

      await service.logout('expired-token')

      expect(redisService.set).not.toHaveBeenCalled()
    })

    it('should not throw if token is invalid', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid') })

      // Should not throw
      await expect(service.logout('bad-token')).resolves.toBeUndefined()
    })
  })

  /* ---------- isTokenBlacklisted ---------- */
  describe('isTokenBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      redisService.exists.mockResolvedValue(true)

      const result = await service.isTokenBlacklisted('blacklisted-token')

      expect(result).toBe(true)
      expect(redisService.exists).toHaveBeenCalledWith(
        'auth:blacklist:blacklisted-token',
      )
    })

    it('should return false if token is not blacklisted', async () => {
      redisService.exists.mockResolvedValue(false)

      const result = await service.isTokenBlacklisted('valid-token')
      expect(result).toBe(false)
    })
  })
})
