import { Module, Global } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { NotificationGateway } from './notification.gateway'
import { NotificationService } from './notification.service'
import { TokenService } from '../auth/token.service'

/**
 * Global notification module.
 * Provides WebSocket gateway and NotificationService for all feature modules.
 * Uses TokenService directly for token blacklist checks (no AuthModule import).
 * JwtModule is registered with an empty config — the gateway always passes
 * explicit verify options, so no module-level JWT config is needed.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [NotificationGateway, NotificationService, TokenService],
  exports: [NotificationService],
})
export class NotificationModule {}
