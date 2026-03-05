import { Module, Global } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { NotificationService } from './notification.service'

/**
 * Global notification module.
 * Provides WebSocket gateway and NotificationService for all feature modules.
 */
@Global()
@Module({
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
