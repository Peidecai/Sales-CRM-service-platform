import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService } from '../../src/modules/auth/auth.service'
import { UserService } from '../../src/modules/user/user.service'
import { TokenService } from '../../src/modules/auth/token.service'
import { CaptchaService } from '../../src/modules/auth/captcha.service'
import { PermissionCacheService } from '../../src/modules/rbac/permission-cache.service'
import { MiniappUser } from '../../src/modules/auth/miniapp-user.entity'
import { RedisService } from '../../src/common/redis'
import {
  createMockRepository,
  createMockRedisService,
  createMockJwtService,
  createMockConfigService,
  fixtures,
  type MockRedisService,
  type MockJwtService,
} from '../test-utils'

describe('O2 — Passive Logout', () => {
  let authService: AuthService
  let tokenService: {
    generateTokens: jest.Mock
    verifyRefreshToken: jest.Mock
    isTokenBlacklisted: jest.Mock
    checkFamilyReplay: jest.Mock
    revokeToken: jest.Mock
    revokeAllUserSessions: jest.Mock
  }
  let userService: {
    findByUsername: jest.Mock
    findOne: jest.Mock
    validatePassword: jest.Mock
    update: jest.Mock
  }
  let redisService: MockRedisService

  // Separate TokenService instance for O2.3 test
  let realTokenService: TokenService
  let realRedisService: MockRedisService
  let realJwtService: MockJwtService

  beforeEach(async () => {
    userService = {
      findByUsername: jest.fn(),
      findOne: jest.fn(),
      validatePassword: jest.fn(),
      update: jest.fn(),
    }
    redisService = createMockRedisService()
    tokenService = {
      generateTokens: jest.fn().mockReturnValue({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
      }),
      verifyRefreshToken: jest.fn(),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
      checkFamilyReplay: jest.fn().mockResolvedValue(true),
      revokeToken: jest.fn(),
      revokeAllUserSessions: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: TokenService, useValue: tokenService },
        { provide: CaptchaService, useValue: { verify: jest.fn().mockResolvedValue(true) } },
        {
          provide: PermissionCacheService,
          useValue: {
            getPermissionCodes: jest.fn().mockResolvedValue([]),
            invalidateUserPermissions: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: JwtService, useValue: createMockJwtService() },
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: RedisService, useValue: redisService },
        { provide: getRepositoryToken(MiniappUser), useValue: createMockRepository() },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)

    // Build real TokenService for O2.3
    realJwtService = createMockJwtService()
    realRedisService = createMockRedisService()
    const realConfigService = createMockConfigService({
      JWT_PRIVATE_KEY: '',
      JWT_PUBLIC_KEY: '',
    })

    const tokenModule: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: realJwtService },
        { provide: ConfigService, useValue: realConfigService },
        { provide: RedisService, useValue: realRedisService },
      ],
    }).compile()

    realTokenService = tokenModule.get<TokenService>(TokenService)
  })

  afterEach(() => jest.restoreAllMocks())

  it('O2.2 should revoke all sessions after password change', async () => {
    const user = fixtures.user()
    userService.findOne.mockResolvedValue({ ...user })
    userService.findByUsername.mockResolvedValue(user)
    userService.validatePassword.mockResolvedValue(true)
    userService.update.mockResolvedValue(undefined)

    await authService.changePassword(1, {
      oldPassword: 'oldpass',
      newPassword: 'newpass123',
    })

    expect(tokenService.revokeAllUserSessions).toHaveBeenCalledWith(1)
  })

  it('O2.3 should blacklist old session when new device logs in', async () => {
    realJwtService.sign
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token')
    // get(user_session:1:web) returns old JTI
    realRedisService.get.mockResolvedValueOnce('old-jti-123')

    await realTokenService.generateTokens({
      id: 1,
      username: 'admin',
      role: 'admin',
      name: 'Admin',
    })

    // Old JTI should be blacklisted
    expect(realRedisService.set).toHaveBeenCalledWith(
      'auth:blacklist:old-jti-123',
      '1',
      expect.any(Number),
    )
    // Old JTI removed from whitelist
    expect(realRedisService.del).toHaveBeenCalledWith('jti:whitelist:old-jti-123')
  })
})
