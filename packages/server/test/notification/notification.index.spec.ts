import { NotificationModule } from '../../src/modules/notification/notification.module'
import { NotificationService } from '../../src/modules/notification/notification.service'
import { NotificationGateway } from '../../src/modules/notification/notification.gateway'
import { NotificationType } from '../../src/modules/notification/notification.types'
import * as notificationIndex from '../../src/modules/notification'

describe('notification index exports', () => {
  it('should re-export module, service, gateway and types', () => {
    expect(notificationIndex.NotificationModule).toBe(NotificationModule)
    expect(notificationIndex.NotificationService).toBe(NotificationService)
    expect(notificationIndex.NotificationGateway).toBe(NotificationGateway)
    expect(notificationIndex.NotificationType).toBe(NotificationType)
  })
})
