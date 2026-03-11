import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
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
        const privateKey = (configService.get<string>('JWT_PRIVATE_KEY', '') || '').replace(
          /\\n/g,
          '\n',
        )
        const publicKey = (configService.get<string>('JWT_PUBLIC_KEY', '') || '').replace(
          /\\n/g,
          '\n',
        )
        const useRS256 = !!privateKey

        if (useRS256) {
          return {
            privateKey,
            publicKey,
            signOptions: {
              algorithm: 'RS256',
              expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'),
            },
            verifyOptions: {
              algorithms: ['RS256'],
            },
          }
        }

        // Fallback to HS256 for local dev without RSA keys
        return {
          secret: configService.get<string>('JWT_SECRET', 'dev-secret-key'),
          signOptions: {
            expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '2h'),
          },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
