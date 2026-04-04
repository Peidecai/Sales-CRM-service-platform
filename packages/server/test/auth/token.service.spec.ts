import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { TokenService } from '../../src/modules/auth/token.service'
import { RedisService } from '../../src/common/redis'
import {
  createMockRedisService,
  createMockJwtService,
  createMockConfigService,
  type MockRedisService,
  type MockJwtService,
} from '../test-utils'

describe('TokenService', () => {
  let service: TokenService
  let jwtService: MockJwtService
  let redisService: MockRedisService
  let configService: { get: jest.Mock }

  beforeEach(async () => {
    jwtService = createMockJwtService()
    redisService = createMockRedisService()
    configService = createMockConfigService({
      JWT_PRIVATE_KEY: '',
      JWT_PUBLIC_KEY: '',
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile()

    service = module.get<TokenService>(TokenService)
  })

  afterEach(() => jest.restoreAllMocks())

  /* ---------- T3 — Token Security ---------- */
  describe('T3 — Token Security', () => {
    it('T3.1 should detect blacklisted token after revocation', async () => {
      // Token not in whitelist → blacklisted
      redisService.exists
        .mockResolvedValueOnce(false) // jti:whitelist check → not found

      const result = await service.isTokenBlacklisted('some-token', 'revoked-jti')

      expect(result).toBe(true)
      expect(redisService.exists).toHaveBeenCalledWith('jti:whitelist:revoked-jti')
    })

    it('T3.2 should detect token family replay and revoke all sessions', async () => {
      // Stored JTI differs from provided JTI → replay detected
      redisService.get.mockResolvedValueOnce('different-jti')
      // revokeAllUserSessions will call get for each device type
      redisService.get.mockResolvedValue(null)
      redisService.delByPattern.mockResolvedValue(0)

      const result = await service.checkFamilyReplay(1, 'family-id', 'current-jti')

      expect(result).toBe(false)
      expect(redisService.del).toHaveBeenCalledWith('refresh_family:1:family-id')
    })

    it('T3.3 should reject access token used as refresh token', () => {
      // verifyRefreshToken uses refreshSecret; passing access token → verify throws
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature')
      })

      expect(() => service.verifyRefreshToken('access-token-string')).toThrow(
        'invalid signature',
      )
      expect(jwtService.verify).toHaveBeenCalledWith('access-token-string', {
        secret: 'test-refresh-secret',
      })
    })

    it('T3.4 should reject token with tampered payload', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token')
      })

      expect(() => service.verifyRefreshToken('tampered-token')).toThrow('invalid token')
    })
  })

  /* ---------- T1 — Token Lifecycle ---------- */
  describe('T1 — Token Lifecycle', () => {
    it('T1.2 should include required fields in access token payload', async () => {
      jwtService.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token')
      redisService.get.mockResolvedValue(null) // no old session

      await service.generateTokens({
        id: 1,
        username: 'admin',
        role: 'admin',
        name: 'Admin',
      })

      // First sign call = access token
      const accessPayload = jwtService.sign.mock.calls[0][0]
      expect(accessPayload).toMatchObject({
        sub: 1,
        username: 'admin',
        role: 'admin',
        type: 'access',
      })
      expect(accessPayload.jti).toBeDefined()
      expect(accessPayload.familyId).toBeDefined()

      // Second sign call = refresh token
      const refreshPayload = jwtService.sign.mock.calls[1][0]
      expect(refreshPayload).toMatchObject({
        sub: 1,
        username: 'admin',
        role: 'admin',
        type: 'refresh',
      })
    })

    it('T1.3 should return false for non-blacklisted token', async () => {
      // JTI exists in whitelist → not blacklisted
      redisService.exists
        .mockResolvedValueOnce(true)  // jti:whitelist check → found
        .mockResolvedValueOnce(false) // auth:blacklist check → not found

      const result = await service.isTokenBlacklisted('valid-token', 'valid-jti')

      expect(result).toBe(false)
    })
  })
})
