import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { AuthService } from './auth.service'

export interface JwtPayload {
  sub: number
  username: string
  role: string
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-key'),
      passReqToCallback: true,
    })
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('Invalid token')
    }

    // Check JWT blacklist (logout)
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const isBlacklisted = await this.authService.isTokenBlacklisted(token)
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked')
      }
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    }
  }
}
