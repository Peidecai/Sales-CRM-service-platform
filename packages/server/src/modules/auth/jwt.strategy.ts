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
  type?: 'access' | 'refresh'
  jti?: string
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const privateKey = (configService.get<string>('JWT_PRIVATE_KEY', '') || '').replace(
      /\\n/g,
      '\n',
    )
    const publicKey = (configService.get<string>('JWT_PUBLIC_KEY', '') || '').replace(/\\n/g, '\n')
    const useRS256 = !!privateKey

    const nodeEnv = configService.get<string>('NODE_ENV', 'development')
    const jwtSecret = configService.get<string>('JWT_SECRET', '')
    if (nodeEnv === 'production' && !useRS256) {
      if (!jwtSecret || jwtSecret === 'your-secret-key' || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be set to a strong secret (>=32 chars) in production')
      }
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: useRS256 ? publicKey : jwtSecret || 'dev-secret-key',
      algorithms: useRS256 ? ['RS256'] : ['HS256'],
      passReqToCallback: true,
    })
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('Invalid token')
    }

    // Reject refresh tokens used as access tokens
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type')
    }

    // Check JWT blacklist (logout)
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const isBlacklisted = await this.authService.isTokenBlacklisted(token, payload.jti)
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked')
      }
    }

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      jti: payload.jti,
    }
  }
}
