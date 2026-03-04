import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'

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
