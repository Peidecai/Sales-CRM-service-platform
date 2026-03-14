import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { RedisService } from '../../common/redis'
import { UserService } from '../user/user.service'
import { TokenService, type TokenPair } from './token.service'
import { CaptchaService } from './captcha.service'

const AUTH_KEYS = {
  LOGIN_FAIL: 'login_fail',
}

@Injectable()
export class AuthService {
  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly captchaService: CaptchaService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────

  async login(loginDto: LoginDto): Promise<TokenPair> {
    // Login failure lockout check — fail-open on Redis error (skip lockout, allow login attempt)
    const failKey = `${AUTH_KEYS.LOGIN_FAIL}:${loginDto.username}`
    let failCount = 0
    try {
      const failCountStr = await this.redisService.get(failKey)
      failCount = failCountStr ? parseInt(failCountStr, 10) : 0
    } catch {
      // Redis unavailable — proceed without lockout enforcement
    }

    if (failCount >= 5) {
      throw new UnauthorizedException('账户已锁定 30 分钟，请稍后再试')
    }

    // Captcha check — if failCount >= 3, require captcha
    if (failCount >= 3 && loginDto.captchaId && loginDto.captchaCode) {
      const captchaValid = await this.captchaService.verify(
        loginDto.captchaId,
        loginDto.captchaCode,
      )
      if (!captchaValid) {
        throw new BadRequestException('验证码错误')
      }
    } else if (failCount >= 3 && (!loginDto.captchaId || !loginDto.captchaCode)) {
      throw new BadRequestException('需要输入验证码')
    }

    const user = await this.userService.findByUsername(loginDto.username)

    if (!user) {
      await this.incrementLoginFail(failKey)
      const newCount = failCount + 1
      throw new UnauthorizedException(
        newCount >= 3 ? { message: '用户名或密码错误', requireCaptcha: true } : '用户名或密码错误',
      )
    }

    if (!user.isActive) {
      throw new UnauthorizedException('账户已被禁用')
    }

    const isPasswordValid = await this.userService.validatePassword(user, loginDto.password)
    if (!isPasswordValid) {
      await this.incrementLoginFail(failKey)
      const newCount = failCount + 1
      throw new UnauthorizedException(
        newCount >= 3 ? { message: '用户名或密码错误', requireCaptcha: true } : '用户名或密码错误',
      )
    }

    // Successful login — clear fail counter
    await this.redisService.del(failKey)

    const deviceType = loginDto.deviceType || 'web'
    return this.tokenService.generateTokens(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      deviceType,
    )
  }

  // ─── Refresh Token ──────────────────────────────────────────────────

  async refreshToken(token: string): Promise<TokenPair> {
    try {
      const payload = this.tokenService.verifyRefreshToken(token)

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的 Refresh Token')
      }

      // Token Family replay detection
      if (payload.familyId && payload.jti) {
        const isValid = await this.tokenService.checkFamilyReplay(
          payload.sub,
          payload.familyId,
          payload.jti,
        )
        if (!isValid) {
          throw new UnauthorizedException('Token 已被使用，疑似重放攻击，所有会话已失效')
        }
      }

      const user = await this.userService.findByUsername(payload.username)
      if (!user || !user.isActive) {
        throw new UnauthorizedException('用户不存在或已被禁用')
      }

      return this.tokenService.generateTokens(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        'web',
        payload.familyId,
      )
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Refresh Token 无效或已过期')
    }
  }

  // ─── Profile ────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    return this.userService.findOne(userId)
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.userService.update(userId, dto)
  }

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

    // Revoke all sessions on password change
    await this.tokenService.revokeAllUserSessions(userId)
    return null
  }

  // ─── Logout ─────────────────────────────────────────────────────────

  async logout(token: string): Promise<void> {
    await this.tokenService.revokeToken(token)
  }

  /** Check if a token has been revoked — delegates to TokenService */
  async isTokenBlacklisted(token: string, jti?: string): Promise<boolean> {
    return this.tokenService.isTokenBlacklisted(token, jti)
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private async incrementLoginFail(key: string): Promise<void> {
    await this.redisService.incr(key)
    await this.redisService.expire(key, 1800) // 30 minutes
  }
}
