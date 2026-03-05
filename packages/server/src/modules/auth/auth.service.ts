import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { RedisService } from '../../common/redis'
import { CACHE_KEYS } from '../../common/redis'
import { UserService } from '../user/user.service'

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private userService: UserService,
  ) {}

  async login(loginDto: LoginDto) {
    // Look up user from database by username or email
    const user = await this.userService.findByUsername(loginDto.username)

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('账户已被禁用')
    }

    const isPasswordValid = await this.userService.validatePassword(user, loginDto.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误')
    }

    return this.generateTokens({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    })
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-key'),
      }) as { sub: number; username: string; role: string }

      const user = await this.userService.findByUsername(payload.username)
      if (!user || !user.isActive) {
        throw new UnauthorizedException('用户不存在或已被禁用')
      }

      return this.generateTokens({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      })
    } catch {
      throw new UnauthorizedException('Refresh Token 无效或已过期')
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: number) {
    return this.userService.findOne(userId)
  }

  /**
   * Update current user profile (name, email, phone only)
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.userService.update(userId, dto)
  }

  /**
   * Change password — requires old password verification
   */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userService.findByUsername(
      (await this.userService.findOne(userId)).username,
    )

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    const isOldPasswordValid = await this.userService.validatePassword(user, dto.oldPassword)
    if (!isOldPasswordValid) {
      throw new BadRequestException('当前密码不正确')
    }

    await this.userService.update(userId, { password: dto.newPassword })
    return null
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
