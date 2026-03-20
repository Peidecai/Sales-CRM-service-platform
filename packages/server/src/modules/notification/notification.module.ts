import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { NotificationGateway } from './notification.gateway'
import { NotificationService } from './notification.service'
import { NotificationSettingService } from './notification-setting.service'
import { NotificationController } from './notification.controller'
import { NotificationSetting } from './entities/notification-setting.entity'
import { TokenService } from '../auth/token.service'

/**
 * Global notification module.
 * Provides WebSocket gateway, NotificationService, and NotificationSettingService.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([NotificationSetting]), JwtModule.register({})],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService, NotificationSettingService, TokenService],
  exports: [NotificationService, NotificationSettingService],
})
export class NotificationModule {}
