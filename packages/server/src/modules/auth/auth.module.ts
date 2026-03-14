import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { TokenService } from './token.service'
import { WxAuthService } from './wx-auth.service'
import { CaptchaService } from './captcha.service'
import { JwtStrategy } from './jwt.strategy'
import { MiniappUser } from './miniapp-user.entity'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([MiniappUser]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development')
        const isProduction = nodeEnv === 'production'

        const privateKey = (configService.get<string>('JWT_PRIVATE_KEY', '') || '').replace(
          /\\n/g,
          '\n',
        )
        const publicKey = (configService.get<string>('JWT_PUBLIC_KEY', '') || '').replace(
          /\\n/g,
          '\n',
        )
        const jwtSecret = configService.get<string>('JWT_SECRET', '')

        // Production: require explicit key configuration
        if (isProduction && !privateKey && !jwtSecret) {
          throw new Error(
            'Production 环境必须配置 JWT_PRIVATE_KEY（RS256）或 JWT_SECRET（HS256），禁止使用默认密钥',
          )
        }

        const useRS256 = !!privateKey

        if (useRS256) {
          return {
            privateKey,
            publicKey,
            signOptions: {
              algorithm: 'RS256' as const,
              expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'),
            },
            verifyOptions: {
              algorithms: ['RS256' as const],
            },
          }
        }

        // HS256 fallback — in dev, allow default secret
        return {
          secret: jwtSecret || 'dev-secret-key',
          signOptions: {
            expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'),
          },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, WxAuthService, CaptchaService, JwtStrategy],
  exports: [AuthService, TokenService, JwtModule, PassportModule],
})
export class AuthModule {}
