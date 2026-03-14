import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MiniappUser } from './miniapp-user.entity'
import { UserService } from '../user/user.service'
import { TokenService, type TokenPair } from './token.service'

@Injectable()
export class WxAuthService {
  private readonly logger = new Logger(WxAuthService.name)
  private readonly wxAppId: string
  private readonly wxAppSecret: string

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    @InjectRepository(MiniappUser)
    private readonly miniappUserRepo: Repository<MiniappUser>,
  ) {
    this.wxAppId = configService.get<string>('WX_MINIAPP_APPID', '')
    this.wxAppSecret = configService.get<string>('WX_MINIAPP_SECRET', '')
  }

  /**
   * Exchange WeChat wx.login code for JWT tokens.
   */
  async wxLogin(code: string): Promise<TokenPair> {
    if (!this.wxAppId || !this.wxAppSecret) {
      throw new BadRequestException(
        '微信小程序未配置，请设置 WX_MINIAPP_APPID 和 WX_MINIAPP_SECRET 环境变量',
      )
    }

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

    let miniappUser = await this.miniappUserRepo.findOne({ where: { openid } })

    if (!miniappUser) {
      miniappUser = this.miniappUserRepo.create({
        openid,
        unionId: unionid || '',
        sessionKey: session_key || '',
      })
      miniappUser = await this.miniappUserRepo.save(miniappUser)
    } else {
      miniappUser.sessionKey = session_key || ''
      if (unionid) miniappUser.unionId = unionid
      await this.miniappUserRepo.save(miniappUser)
    }

    if (miniappUser.userId) {
      const user = await this.userService.findOne(miniappUser.userId)
      if (user && user.isActive) {
        return this.tokenService.generateTokens(
          { id: user.id, username: user.username, role: user.role, name: user.name },
          'miniapp',
        )
      }
    }

    return this.tokenService.generateTokens(
      {
        id: miniappUser.id * -1,
        username: `wx_${openid.slice(-8)}`,
        role: 'sales',
        name: miniappUser.nickname || `微信用户`,
      },
      'miniapp',
    )
  }

  /**
   * Bind phone number via WeChat getPhoneNumber API.
   */
  async bindPhone(userId: number, phoneCode: string): Promise<{ phone: string }> {
    if (!this.wxAppId || !this.wxAppSecret) {
      throw new BadRequestException('微信小程序未配置')
    }

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

    const miniappUserId = userId < 0 ? Math.abs(userId) : undefined
    if (miniappUserId) {
      const miniappUser = await this.miniappUserRepo.findOne({
        where: { id: miniappUserId },
      })
      if (miniappUser) {
        miniappUser.phone = phone
        await this.miniappUserRepo.save(miniappUser)
      }
    }

    return { phone }
  }
}
