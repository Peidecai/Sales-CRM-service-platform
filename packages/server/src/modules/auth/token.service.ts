import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { v4 as uuidv4 } from 'uuid'
import { RedisService } from '../../common/redis'

/** Redis key prefixes for token management */
export const TOKEN_KEYS = {
  JTI_WHITELIST: 'jti:whitelist',
  REFRESH_FAMILY: 'refresh_family',
  JWT_BLACKLIST: 'auth:blacklist',
  USER_SESSION: 'user_session',
}

export interface TokenUser {
  id: number
  username: string
  role: string
  name: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  user: { id: number; username: string; role: string; name: string }
}

/** Decoded payload shape shared by access and refresh tokens */
export interface JwtTokenPayload {
  sub: number
  username: string
  role: string
  type?: string
  jti?: string
  familyId?: string
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name)
  private readonly useRS256: boolean
  private readonly privateKey: string
  private readonly publicKey: string
  private readonly hmacSecret: string
  private readonly refreshSecret: string
  private readonly accessTtlSeconds: number
  private readonly refreshTtlSeconds: number

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.privateKey = (configService.get<string>('JWT_PRIVATE_KEY', '') || '').replace(/\\n/g, '\n')
    this.publicKey = (configService.get<string>('JWT_PUBLIC_KEY', '') || '').replace(/\\n/g, '\n')
    this.useRS256 = !!this.privateKey
    this.hmacSecret = configService.get<string>('JWT_SECRET', 'dev-secret-key')
    this.refreshSecret = configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-key')
    this.accessTtlSeconds = this.parseTtl(configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'))
    this.refreshTtlSeconds = this.parseTtl(
      configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    )
  }

  /**
   * Generate access + refresh token pair.
   * Handles JTI whitelist, refresh family, and multi-device session control.
   */
  async generateTokens(
    user: TokenUser,
    deviceType: string = 'web',
    existingFamilyId?: string,
  ): Promise<TokenPair> {
    const jti = uuidv4()
    const refreshJti = uuidv4()
    const familyId = existingFamilyId || uuidv4()

    const signOptions = this.useRS256
      ? { privateKey: this.privateKey, algorithm: 'RS256' as const }
      : { secret: this.hmacSecret }

    // Sign both tokens synchronously before any async Redis work
    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username, role: user.role, jti, familyId, type: 'access' },
      { ...signOptions, expiresIn: this.accessTtlSeconds },
    )

    const refreshSignOptions = this.useRS256
      ? { privateKey: this.privateKey, algorithm: 'RS256' as const }
      : { secret: this.refreshSecret }

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        jti: refreshJti,
        familyId,
        type: 'refresh',
      },
      { ...refreshSignOptions, expiresIn: this.refreshTtlSeconds },
    )

    // Steps 1 + 2 are independent — run in parallel
    await Promise.all([
      this.redisService.set(
        `${TOKEN_KEYS.JTI_WHITELIST}:${jti}`,
        String(user.id),
        this.accessTtlSeconds,
      ),
      this.redisService.set(
        `${TOKEN_KEYS.REFRESH_FAMILY}:${user.id}:${familyId}`,
        refreshJti,
        this.refreshTtlSeconds,
      ),
    ])

    // Multi-device session control — kick old same-type session (sequential: depends on get result)
    const sessionKey = `${TOKEN_KEYS.USER_SESSION}:${user.id}:${deviceType}`
    const oldJti = await this.redisService.get(sessionKey)
    if (oldJti) {
      await Promise.all([
        this.redisService.set(`${TOKEN_KEYS.JWT_BLACKLIST}:${oldJti}`, '1', this.accessTtlSeconds),
        this.redisService.del(`${TOKEN_KEYS.JTI_WHITELIST}:${oldJti}`),
      ])
    }
    await this.redisService.set(sessionKey, jti, this.refreshTtlSeconds)

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
    }
  }

  /**
   * Verify and decode a refresh token.
   * Returns the decoded payload, or throws on invalid/replayed tokens.
   */
  verifyRefreshToken(token: string): JwtTokenPayload {
    const verifyOptions = this.useRS256
      ? { secret: this.publicKey, algorithms: ['RS256' as const] }
      : { secret: this.refreshSecret }

    return this.jwtService.verify(token, verifyOptions) as JwtTokenPayload
  }

  /**
   * Detect token family replay attacks.
   * Returns true if the token is valid (JTI matches stored family JTI).
   * On Redis error: fail-open (return true) to avoid locking out all users.
   */
  async checkFamilyReplay(userId: number, familyId: string, jti: string): Promise<boolean> {
    try {
      const familyKey = `${TOKEN_KEYS.REFRESH_FAMILY}:${userId}:${familyId}`
      const storedJti = await this.redisService.get(familyKey)
      if (storedJti !== jti) {
        this.logger.warn(`Token replay detected for user ${userId}, family ${familyId}`)
        await this.redisService.del(familyKey)
        await this.revokeAllUserSessions(userId)
        return false
      }
      return true
    } catch (err) {
      this.logger.warn(
        `Redis unavailable during checkFamilyReplay for user ${userId} — failing open: ${(err as Error).message}`,
      )
      return true
    }
  }

  /**
   * Revoke a single access token (logout).
   * Removes JTI from whitelist, removes token family, and adds to legacy blacklist.
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const verifyOptions = this.useRS256
        ? { secret: this.publicKey, algorithms: ['RS256' as const] }
        : { secret: this.hmacSecret }

      const payload = this.jwtService.verify(token, verifyOptions) as {
        sub: number
        exp: number
        jti?: string
        familyId?: string
      }

      const now = Math.floor(Date.now() / 1000)
      const ttl = payload.exp - now

      if (payload.jti) {
        await this.redisService.del(`${TOKEN_KEYS.JTI_WHITELIST}:${payload.jti}`)
      }

      if (payload.familyId) {
        await this.redisService.del(
          `${TOKEN_KEYS.REFRESH_FAMILY}:${payload.sub}:${payload.familyId}`,
        )
      }

      if (ttl > 0) {
        const key = `${TOKEN_KEYS.JWT_BLACKLIST}:${payload.jti || token}`
        await this.redisService.set(key, '1', ttl)
      }
    } catch {
      // Token already expired or invalid — no need to blacklist
    }
  }

  /** Check if a token has been revoked.
   *  On Redis error: fail-open (return false) — users keep access during outage.
   *  Security trade-off: a revoked token may work for up to its remaining TTL (max 2h).
   */
  async isTokenBlacklisted(token: string, jti?: string): Promise<boolean> {
    try {
      if (jti) {
        const inWhitelist = await this.redisService.exists(`${TOKEN_KEYS.JTI_WHITELIST}:${jti}`)
        if (!inWhitelist) {
          return true
        }
      }
      const key = `${TOKEN_KEYS.JWT_BLACKLIST}:${jti || token}`
      return await this.redisService.exists(key)
    } catch (err) {
      this.logger.warn(
        `Redis unavailable during isTokenBlacklisted — failing open: ${(err as Error).message}`,
      )
      return false
    }
  }

  /** Revoke all sessions for a given user. Best-effort — Redis errors are logged. */
  async revokeAllUserSessions(userId: number): Promise<void> {
    // All three device types are independent — run in parallel
    await Promise.all(
      ['web', 'mobile', 'miniapp'].map(async (deviceType) => {
        try {
          const sessionKey = `${TOKEN_KEYS.USER_SESSION}:${userId}:${deviceType}`
          const jti = await this.redisService.get(sessionKey)
          if (jti) {
            await Promise.all([
              this.redisService.del(`${TOKEN_KEYS.JTI_WHITELIST}:${jti}`),
              this.redisService.set(
                `${TOKEN_KEYS.JWT_BLACKLIST}:${jti}`,
                '1',
                this.accessTtlSeconds,
              ),
            ])
          }
          await this.redisService.del(sessionKey)
        } catch (err) {
          this.logger.warn(
            `Redis error revoking session for user ${userId} device ${deviceType}: ${(err as Error).message}`,
          )
        }
      }),
    )
    await this.redisService.delByPattern(`${TOKEN_KEYS.REFRESH_FAMILY}:${userId}:*`)
  }

  private parseTtl(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return 7200
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
    return parseInt(match[1], 10) * (multipliers[match[2]] ?? 3600)
  }
}
