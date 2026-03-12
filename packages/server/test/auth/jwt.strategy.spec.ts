import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy'

describe('JwtStrategy', () => {
  let strategy: JwtStrategy
  let configService: { get: jest.Mock }
  let authService: { isTokenBlacklisted: jest.Mock }

  beforeEach(() => {
    configService = {
      get: jest.fn((_key: string, defaultVal: unknown) => defaultVal),
    }
    authService = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    }

    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      authService as never,
    )
  })

  it('should throw UnauthorizedException for invalid payload', async () => {
    const req = { headers: {} } as never

    await expect(
      strategy.validate(req, { sub: 0, username: '', role: 'sales' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('should return mapped user when payload is valid and no auth header', async () => {
    const req = { headers: {} } as never

    const result = await strategy.validate(req, {
      sub: 1,
      username: 'alice',
      role: 'manager',
    })

    expect(authService.isTokenBlacklisted).not.toHaveBeenCalled()
    expect(result).toEqual({
      id: 1,
      username: 'alice',
      role: 'manager',
    })
  })

  it('should check token blacklist when auth header exists', async () => {
    const req = {
      headers: {
        authorization: 'Bearer jwt-token-abc',
      },
    } as never

    const result = await strategy.validate(req, {
      sub: 2,
      username: 'bob',
      role: 'sales',
    })

    expect(authService.isTokenBlacklisted).toHaveBeenCalledWith('jwt-token-abc', undefined)
    expect(result).toEqual({
      id: 2,
      username: 'bob',
      role: 'sales',
    })
  })

  it('should throw UnauthorizedException for blacklisted token', async () => {
    authService.isTokenBlacklisted.mockResolvedValue(true)
    const req = {
      headers: {
        authorization: 'Bearer revoked-token',
      },
    } as never

    await expect(
      strategy.validate(req, { sub: 3, username: 'carol', role: 'admin' }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
