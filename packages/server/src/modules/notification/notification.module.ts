import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { NotificationGateway } from './notification.gateway'
import { NotificationService } from './notification.service'
import { NotificationSettingService } from './notification-setting.service'
import { NotificationInboxService } from './notification-inbox.service'
import { NotificationController } from './notification.controller'
import { NotificationInboxController } from './notification-inbox.controller'
import { NotificationSetting } from './entities/notification-setting.entity'
import { Notification } from './entities/notification.entity'
import { TokenService } from '../auth/token.service'

/**
 * Global notification module.
 * Provides WebSocket gateway, NotificationService, NotificationSettingService,
 * and NotificationInboxService (persistent notification storage + REST inbox).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([NotificationSetting, Notification]), JwtModule.register({})],
  controllers: [NotificationController, NotificationInboxController],
  providers: [
    NotificationGateway,
    NotificationService,
    NotificationSettingService,
    NotificationInboxService,
    TokenService,
  ],
  exports: [NotificationService, NotificationSettingService, NotificationInboxService],
})
export class NotificationModule {}
