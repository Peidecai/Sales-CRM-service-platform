import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { MiniappUser } from './miniapp-user.entity'
import { RedisService } from '../../common/redis'
import { UserService } from '../user/user.service'

/** Redis key prefixes for auth */
const AUTH_KEYS = {
  JTI_WHITELIST: 'jti:whitelist',
  REFRESH_FAMILY: 'refresh_family',
  JWT_BLACKLIST: 'auth:blacklist',
  LOGIN_FAIL: 'login_fail',
  CAPTCHA: 'captcha',
  USER_SESSION: 'user_session',
  NONCE: 'nonce',
  USER_PERMISSIONS: 'user_permissions',
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly useRS256: boolean
  private readonly privateKey: string
  private readonly publicKey: string
  private readonly hmacSecret: string
  private readonly refreshSecret: string
  private readonly accessTtlSeconds: number
  private readonly refreshTtlSeconds: number
  private readonly wxAppId: string
  private readonly wxAppSecret: string

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private userService: UserService,
    @InjectRepository(MiniappUser)
    private miniappUserRepo: Repository<MiniappUser>,
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
    this.wxAppId = configService.get<string>('WX_MINIAPP_APPID', '')
    this.wxAppSecret = configService.get<string>('WX_MINIAPP_SECRET', '')
  }

  // ─── Login ───────────────────────────────────────────────────────────

  async login(loginDto: LoginDto) {
    // Login failure lockout check (#156)
    const failKey = `${AUTH_KEYS.LOGIN_FAIL}:${loginDto.username}`
    const failCountStr = await this.redisService.get(failKey)
    const failCount = failCountStr ? parseInt(failCountStr, 10) : 0

    if (failCount >= 5) {
      throw new UnauthorizedException('账户已锁定 30 分钟，请稍后再试')
    }

    // Captcha check (#157) — if failCount >= 3, require captcha
    if (failCount >= 3 && loginDto.captchaId && loginDto.captchaCode) {
      const captchaValid = await this.verifyCaptcha(loginDto.captchaId, loginDto.captchaCode)
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
    return this.generateTokens(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      deviceType,
    )
  }

  // ─── Refresh Token ──────────────────────────────────────────────────

  async refreshToken(token: string) {
    try {
      const verifyOptions = this.useRS256
        ? { secret: this.publicKey, algorithms: ['RS256' as const] }
        : { secret: this.refreshSecret }

      const payload = this.jwtService.verify(token, verifyOptions) as {
        sub: number
        username: string
        role: string
        type?: string
        jti?: string
        familyId?: string
      }

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的 Refresh Token')
      }

      // Token Family replay detection (#154)
      if (payload.familyId && payload.jti) {
        const familyKey = `${AUTH_KEYS.REFRESH_FAMILY}:${payload.sub}:${payload.familyId}`
        const storedJti = await this.redisService.get(familyKey)

        if (storedJti !== payload.jti) {
          // Potential replay attack — revoke the entire family
          this.logger.warn(
            `Token replay detected for user ${payload.sub}, family ${payload.familyId}`,
          )
          await this.redisService.del(familyKey)
          // Optionally revoke all user sessions
          await this.revokeAllUserSessions(payload.sub)
          throw new UnauthorizedException('Token 已被使用，疑似重放攻击，所有会话已失效')
        }
      }

      const user = await this.userService.findByUsername(payload.username)
      if (!user || !user.isActive) {
        throw new UnauthorizedException('用户不存在或已被禁用')
      }

      return this.generateTokens(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        'web',
        payload.familyId, // reuse same family
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
    await this.revokeAllUserSessions(userId)
    return null
  }

  // ─── Logout ─────────────────────────────────────────────────────────

  async logout(token: string): Promise<void> {
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

      // Remove JTI from whitelist (#155)
      if (payload.jti) {
        await this.redisService.del(`${AUTH_KEYS.JTI_WHITELIST}:${payload.jti}`)
      }

      // Remove token family (#154)
      if (payload.familyId) {
        await this.redisService.del(
          `${AUTH_KEYS.REFRESH_FAMILY}:${payload.sub}:${payload.familyId}`,
        )
      }

      // Legacy blacklist for backwards compatibility
      if (ttl > 0) {
        const key = `${AUTH_KEYS.JWT_BLACKLIST}:${payload.jti || token}`
        await this.redisService.set(key, '1', ttl)
      }
    } catch {
      // Token already expired or invalid — no need to blacklist
    }
  }

  /** Check if a token has been revoked */
  async isTokenBlacklisted(token: string, jti?: string): Promise<boolean> {
    // First check JTI whitelist — if JTI exists but not in whitelist, it's revoked (#155)
    if (jti) {
      const inWhitelist = await this.redisService.exists(`${AUTH_KEYS.JTI_WHITELIST}:${jti}`)
      if (!inWhitelist) {
        return true
      }
    }

    // Legacy blacklist check
    const key = `${AUTH_KEYS.JWT_BLACKLIST}:${jti || token}`
    return this.redisService.exists(key)
  }

  // ─── Captcha Verification (#157) ───────────────────────────────────

  async verifyCaptcha(captchaId: string, code: string): Promise<boolean> {
    const key = `${AUTH_KEYS.CAPTCHA}:${captchaId}`
    const stored = await this.redisService.get(key)
    if (!stored) return false
    await this.redisService.del(key) // one-time use
    return stored.toLowerCase() === code.toLowerCase()
  }

  // ─── WeChat Mini Program Login (#185) ───────────────────────────────

  /**
   * Exchange WeChat wx.login code for JWT tokens.
   * Calls WeChat jscode2session API, finds/creates miniapp_user,
   * links to users table, returns JWT with deviceType='miniapp'.
   */
  async wxLogin(code: string) {
    if (!this.wxAppId || !this.wxAppSecret) {
      throw new BadRequestException(
        '微信小程序未配置，请设置 WX_MINIAPP_APPID 和 WX_MINIAPP_SECRET 环境变量',
      )
    }

    // Call WeChat jscode2session API
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.wxAppId}&secret=${this.wxAppSecret}&js_code=${code}&grant_type=authorization_code`

    let wxResult: {
      openid?: string
      session_key?: string
      unionid?: string
      errcode?: number
      errmsg?: string
    }
    try {
      const response = await fetch(wxUrl)
      wxResult = (await response.json()) as typeof wxResult
    } catch (err) {
      this.logger.error('WeChat jscode2session request failed:', err)
      throw new BadRequestException('微信服务请求失败')
    }

    if (wxResult.errcode || !wxResult.openid) {
      this.logger.warn(`WeChat login error: ${wxResult.errcode} - ${wxResult.errmsg}`)
      throw new BadRequestException(`微信登录失败: ${wxResult.errmsg || 'unknown error'}`)
    }

    const { openid, session_key, unionid } = wxResult

    // Find or create miniapp user
    let miniappUser = await this.miniappUserRepo.findOne({ where: { openid, deleted: false } })

    if (!miniappUser) {
      miniappUser = this.miniappUserRepo.create({
        openid,
        unionId: unionid || '',
        sessionKey: session_key || '',
      })
      miniappUser = await this.miniappUserRepo.save(miniappUser)
    } else {
      // Update session_key
      miniappUser.sessionKey = session_key || ''
      if (unionid) miniappUser.unionId = unionid
      await this.miniappUserRepo.save(miniappUser)
    }

    // If linked to a system user, generate tokens for that user
    if (miniappUser.userId) {
      const user = await this.userService.findOne(miniappUser.userId)
      if (user && user.isActive) {
        return this.generateTokens(
          { id: user.id, username: user.username, role: user.role, name: user.name },
          'miniapp',
        )
      }
    }

    // If not linked yet, generate a temporary token with limited info
    // The miniapp user needs to bind phone or be linked by admin
    return this.generateTokens(
      {
        id: miniappUser.id * -1, // Negative ID indicates miniapp-only user
        username: `wx_${openid.slice(-8)}`,
        role: 'sales',
        name: miniappUser.nickname || `微信用户`,
      },
      'miniapp',
    )
  }

  /**
   * Bind phone number via WeChat getPhoneNumber API (new version).
   * Uses the code from button event to retrieve the phone number,
   * then links to a matching system user if found.
   */
  async bindPhone(userId: number, phoneCode: string) {
    if (!this.wxAppId || !this.wxAppSecret) {
      throw new BadRequestException('微信小程序未配置')
    }

    // Get access_token first
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.wxAppId}&secret=${this.wxAppSecret}`
    let tokenResult: { access_token?: string; errcode?: number; errmsg?: string }
    try {
      const response = await fetch(tokenUrl)
      tokenResult = (await response.json()) as typeof tokenResult
    } catch {
      throw new BadRequestException('获取微信 access_token 失败')
    }

    if (!tokenResult.access_token) {
      throw new BadRequestException(`获取 access_token 失败: ${tokenResult.errmsg}`)
    }

    // Call getPhoneNumber API with the code
    const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${tokenResult.access_token}`
    let phoneResult: { errcode?: number; errmsg?: string; phone_info?: { phoneNumber: string } }
    try {
      const response = await fetch(phoneUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneCode }),
      })
      phoneResult = (await response.json()) as typeof phoneResult
    } catch {
      throw new BadRequestException('获取手机号失败')
    }

    if (phoneResult.errcode !== 0 || !phoneResult.phone_info?.phoneNumber) {
      throw new BadRequestException(`获取手机号失败: ${phoneResult.errmsg || 'unknown'}`)
    }

    const phone = phoneResult.phone_info.phoneNumber

    // Update miniapp user record
    // If userId is negative, it's a miniapp-only user (id = abs(userId))
    const miniappUserId = userId < 0 ? Math.abs(userId) : undefined
    if (miniappUserId) {
      const miniappUser = await this.miniappUserRepo.findOne({
        where: { id: miniappUserId, deleted: false },
      })
      if (miniappUser) {
        miniappUser.phone = phone
        await this.miniappUserRepo.save(miniappUser)
      }
    }

    return { phone }
  }

  // ─── Token Generation ──────────────────────────────────────────────

  private async generateTokens(
    user: { id: number; username: string; role: string; name: string },
    deviceType: string = 'web',
    existingFamilyId?: string,
  ) {
    const jti = uuidv4()
    const familyId = existingFamilyId || uuidv4()
    const payload = { sub: user.id, username: user.username, role: user.role, jti, familyId }

    const signOptions = this.useRS256
      ? { privateKey: this.privateKey, algorithm: 'RS256' as const }
      : { secret: this.hmacSecret }

    const accessToken = this.jwtService.sign(payload, {
      ...signOptions,
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'),
    })

    // Store JTI in whitelist (#155)
    await this.redisService.set(
      `${AUTH_KEYS.JTI_WHITELIST}:${jti}`,
      String(user.id),
      this.accessTtlSeconds,
    )

    // Refresh token with familyId (#154)
    const refreshJti = uuidv4()
    const refreshPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: refreshJti,
      familyId,
      type: 'refresh',
    }

    const refreshSignOptions = this.useRS256
      ? { privateKey: this.privateKey, algorithm: 'RS256' as const }
      : { secret: this.refreshSecret }

    const refreshToken = this.jwtService.sign(refreshPayload, {
      ...refreshSignOptions,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    })

    // Store refresh JTI in family (#154)
    await this.redisService.set(
      `${AUTH_KEYS.REFRESH_FAMILY}:${user.id}:${familyId}`,
      refreshJti,
      this.refreshTtlSeconds,
    )

    // Multi-device session control (#158) — kick old same-type session
    const sessionKey = `${AUTH_KEYS.USER_SESSION}:${user.id}:${deviceType}`
    const oldJti = await this.redisService.get(sessionKey)
    if (oldJti) {
      // Blacklist old JTI and remove from whitelist
      await this.redisService.set(
        `${AUTH_KEYS.JWT_BLACKLIST}:${oldJti}`,
        '1',
        this.accessTtlSeconds,
      )
      await this.redisService.del(`${AUTH_KEYS.JTI_WHITELIST}:${oldJti}`)
    }
    await this.redisService.set(sessionKey, jti, this.refreshTtlSeconds)

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

  // ─── Helpers ───────────────────────────────────────────────────────

  private async incrementLoginFail(key: string): Promise<void> {
    await this.redisService.incr(key)
    await this.redisService.expire(key, 1800) // 30 minutes
  }

  private async revokeAllUserSessions(userId: number): Promise<void> {
    // Clear all device sessions
    for (const deviceType of ['web', 'mobile', 'miniapp']) {
      const sessionKey = `${AUTH_KEYS.USER_SESSION}:${userId}:${deviceType}`
      const jti = await this.redisService.get(sessionKey)
      if (jti) {
        await this.redisService.del(`${AUTH_KEYS.JTI_WHITELIST}:${jti}`)
        await this.redisService.set(`${AUTH_KEYS.JWT_BLACKLIST}:${jti}`, '1', this.accessTtlSeconds)
      }
      await this.redisService.del(sessionKey)
    }
    // Clear all refresh families
    await this.redisService.delByPattern(`${AUTH_KEYS.REFRESH_FAMILY}:${userId}:*`)
  }

  private parseTtl(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return 7200 // default 2h
    const num = parseInt(match[1], 10)
    switch (match[2]) {
      case 's':
        return num
      case 'm':
        return num * 60
      case 'h':
        return num * 3600
      case 'd':
        return num * 86400
      default:
        return 7200
    }
  }
}
