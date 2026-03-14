import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Request } from 'express'
import { v4 as uuidv4 } from 'uuid'
import * as svgCaptcha from 'svg-captcha'
import { AuthService } from './auth.service'
import { WxAuthService } from './wx-auth.service'
import { CaptchaService } from './captcha.service'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { WxLoginDto } from './dto/wx-login.dto'
import { BindPhoneDto } from './dto/bind-phone.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly wxAuthService: WxAuthService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回 JWT 令牌' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @Get('captcha')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '获取图形验证码' })
  @ApiResponse({ status: 200, description: '返回 SVG 验证码' })
  async getCaptcha() {
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0oO1lI',
      noise: 2,
      color: true,
      background: '#f0f0f0',
    })
    const captchaId = uuidv4()
    // Store captcha text in Redis for 5 minutes
    await this.captchaService.store(captchaId, captcha.text, 300)
    return {
      captchaId,
      svg: captcha.data,
    }
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Access Token' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: 'Refresh Token 无效' })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId)
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  updateProfile(@CurrentUser('id') userId: number, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(userId, dto)
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 400, description: '当前密码不正确' })
  @ApiResponse({ status: 401, description: '未认证' })
  changePassword(@CurrentUser('id') userId: number, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出（加入 JWT 黑名单）' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      await this.authService.logout(token)
    }
    return null
  }

  // ─── WeChat Mini Program ────────────────────────────────────────────

  @Post('wx-login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信小程序登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回 JWT 令牌' })
  @ApiResponse({ status: 400, description: '微信登录失败' })
  wxLogin(@Body() dto: WxLoginDto) {
    return this.wxAuthService.wxLogin(dto.code)
  }

  @Post('bind-phone')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '微信小程序绑定手机号' })
  @ApiResponse({ status: 200, description: '绑定成功' })
  @ApiResponse({ status: 400, description: '获取手机号失败' })
  bindPhone(@CurrentUser('id') userId: number, @Body() dto: BindPhoneDto) {
    return this.wxAuthService.bindPhone(userId, dto.code)
  }
}
