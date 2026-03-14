import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException, BadRequestException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService } from '../../src/modules/auth/auth.service'
import { UserService } from '../../src/modules/user/user.service'
import { TokenService } from '../../src/modules/auth/token.service'
import { CaptchaService } from '../../src/modules/auth/captcha.service'
import { MiniappUser } from '../../src/modules/auth/miniapp-user.entity'
import { RedisService } from '../../src/common/redis'
import { UserRole } from '@crm/shared'
import {
  createMockRepository,
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
  let tokenService: {
    generateTokens: jest.Mock
    verifyRefreshToken: jest.Mock
    isTokenBlacklisted: jest.Mock
    checkFamilyReplay: jest.Mock
    revokeToken: jest.Mock
    revokeAllUserSessions: jest.Mock
  }
  let captchaService: { verify: jest.Mock }

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
    tokenService = {
      generateTokens: jest.fn().mockReturnValue({ accessToken: 'mock-access', refreshToken: 'mock-refresh' }),
      verifyRefreshToken: jest.fn(),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
      checkFamilyReplay: jest.fn().mockResolvedValue(true),
      revokeToken: jest.fn(),
      revokeAllUserSessions: jest.fn(),
    }
    captchaService = { verify: jest.fn().mockResolvedValue(true) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: TokenService, useValue: tokenService },
        { provide: CaptchaService, useValue: captchaService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
        { provide: getRepositoryToken(MiniappUser), useValue: createMockRepository() },
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
      tokenService.generateTokens.mockReturnValue({ accessToken: 'access-token', refreshToken: 'refresh-token' })

      const result = await service.login(loginDto)

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
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
      tokenService.verifyRefreshToken.mockReturnValue({ sub: user.id, username: user.username, role: user.role, type: 'refresh' })
      tokenService.checkFamilyReplay.mockResolvedValue(true)
      userService.findByUsername.mockResolvedValue(user)
      tokenService.generateTokens.mockReturnValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })

      const result = await service.refreshToken('valid-refresh-token')

      expect(result.accessToken).toBe('new-access')
      expect(result.refreshToken).toBe('new-refresh')
    })

    it('should throw if user is inactive', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 1, username: 'test', role: 'sales', type: 'refresh' })
      tokenService.checkFamilyReplay.mockResolvedValue(true)
      userService.findByUsername.mockResolvedValue(fixtures.user({ isActive: false }))

      await expect(service.refreshToken('some-token')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw if user not found', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: 1, username: 'gone', role: 'sales', type: 'refresh' })
      tokenService.checkFamilyReplay.mockResolvedValue(true)
      userService.findByUsername.mockResolvedValue(null)

      await expect(service.refreshToken('some-token')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw if token is invalid', async () => {
      tokenService.verifyRefreshToken.mockImplementation(() => { throw new Error('invalid') })

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
      tokenService.revokeToken.mockResolvedValue(undefined)

      await service.logout('some-access-token')

      expect(tokenService.revokeToken).toHaveBeenCalledWith('some-access-token')
    })

    it('should propagate error if token is invalid', async () => {
      tokenService.revokeToken.mockRejectedValue(new Error('invalid'))

      await expect(service.logout('bad-token')).rejects.toThrow('invalid')
    })
  })

  /* ---------- isTokenBlacklisted ---------- */
  describe('isTokenBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      tokenService.isTokenBlacklisted.mockResolvedValue(true)

      const result = await service.isTokenBlacklisted('blacklisted-token')

      expect(result).toBe(true)
      expect(tokenService.isTokenBlacklisted).toHaveBeenCalledWith('blacklisted-token', undefined)
    })

    it('should return false if token is not blacklisted', async () => {
      tokenService.isTokenBlacklisted.mockResolvedValue(false)

      const result = await service.isTokenBlacklisted('valid-token')
      expect(result).toBe(false)
    })
  })
})
