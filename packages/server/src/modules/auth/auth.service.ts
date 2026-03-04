import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS } from '../../common/redis'

// Temporary in-memory user for development/testing
// Replace with actual UserService + database in production
const DEMO_USERS = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@crm.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    name: 'Admin',
  },
  {
    id: 2,
    username: 'sales01',
    email: 'sales01@crm.com',
    password: bcrypt.hashSync('sales123', 10),
    role: 'sales',
    name: 'Sales01',
  },
]

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = DEMO_USERS.find(
      (u) => u.username === loginDto.username || u.email === loginDto.username,
    )

    if (!user) {
      throw new UnauthorizedException('Invalid username or password')
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password')
    }

    return this.generateTokens(user)
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-key'),
      }) as { sub: number; username: string; role: string }

      const user = DEMO_USERS.find((u) => u.id === payload.sub)
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      return this.generateTokens(user)
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired')
    }
  }

  /**
   * Logout: add the token to a Redis blacklist so it cannot be reused.
   * TTL = remaining seconds until token expiry.
   */
  async logout(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'dev-secret-key'),
      }) as { sub: number; exp: number }

      const now = Math.floor(Date.now() / 1000)
      const ttl = payload.exp - now
      if (ttl > 0) {
        const key = `${CACHE_KEYS.JWT_BLACKLIST}:${token}`
        await this.redisService.set(key, '1', ttl)
      }
    } catch {
      // Token already expired or invalid — no need to blacklist
    }
  }

  /** Check if a token has been blacklisted (used by JwtStrategy) */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${CACHE_KEYS.JWT_BLACKLIST}:${token}`
    return this.redisService.exists(key)
  }

  private generateTokens(user: { id: number; username: string; role: string; name: string }) {
    const payload = { sub: user.id, username: user.username, role: user.role }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'dev-secret-key'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'),
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-key'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    }
  }
}
