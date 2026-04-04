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

describe('E1.3 — Redis Fail-Open', () => {
  let service: TokenService
  let redisService: MockRedisService

  beforeEach(async () => {
    const jwtService: MockJwtService = createMockJwtService()
    redisService = createMockRedisService()
    const configService = createMockConfigService({
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

  it('should return true (fail-open) when Redis is unavailable during checkFamilyReplay', async () => {
    redisService.get.mockRejectedValue(new Error('Redis connection refused'))

    const result = await service.checkFamilyReplay(1, 'family-id', 'jti')

    expect(result).toBe(true)
  })

  it('should return false (fail-open) when Redis is unavailable during isTokenBlacklisted', async () => {
    redisService.exists.mockRejectedValue(new Error('Redis connection refused'))

    const result = await service.isTokenBlacklisted('some-token', 'some-jti')

    expect(result).toBe(false)
  })
})
