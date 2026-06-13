import { Injectable, Logger } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { NotificationInboxService } from './notification-inbox.service'
import { NotificationType, NotificationPayload } from './notification.types'

/**
 * Service layer for sending notifications.
 * Inject this into any business service that needs to push real-time events.
 * Persists every notification to DB for the miniapp message center / REST inbox.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly gateway: NotificationGateway,
    private readonly inboxService: NotificationInboxService,
  ) {}

  /**
   * Broadcast a business event to all connected clients.
   * Also persists as a broadcast notification (userId=0).
   */
  notify(params: {
    type: NotificationType
    actorId: number
    actorName: string
    resource: string
    resourceId: number
    message: string
    data?: Record<string, unknown>
  }) {
    const payload: NotificationPayload = {
      ...params,
      timestamp: new Date().toISOString(),
    }
    this.gateway.broadcast(payload)

    // Persist as broadcast (userId=0)
    this.inboxService
      .create({
        userId: 0,
        type: params.type,
        title: params.resource,
        content: params.message,
        relatedId: params.resourceId,
        relatedType: params.resource,
      })
      .catch((err: unknown) => this.logger.warn('Failed to persist broadcast notification', err))
  }

  /**
   * Send a notification to a specific user only.
   * Also persists with the target userId.
   */
  notifyUser(
    userId: number,
    params: {
      type: NotificationType
      actorId: number
      actorName: string
      resource: string
      resourceId: number
      message: string
      data?: Record<string, unknown>
    },
  ) {
    const payload: NotificationPayload = {
      ...params,
      timestamp: new Date().toISOString(),
    }
    this.gateway.sendToUser(userId, payload)

    // Persist with specific userId
    this.inboxService
      .create({
        userId,
        type: params.type,
        title: params.resource,
        content: params.message,
        relatedId: params.resourceId,
        relatedType: params.resource,
      })
      .catch((err: unknown) => this.logger.warn('Failed to persist user notification', err))
  }

  /**
   * Customer notifications
   */
  customerCreated(actorId: number, actorName: string, customerId: number, customerName: string) {
    this.notify({
      type: NotificationType.CUSTOMER_CREATED,
      actorId,
      actorName,
      resource: 'customer',
      resourceId: customerId,
      message: `${actorName} 创建了客户「${customerName}」`,
      data: { customerName },
    })
  }

  customerUpdated(actorId: number, actorName: string, customerId: number, customerName: string) {
    this.notify({
      type: NotificationType.CUSTOMER_UPDATED,
      actorId,
      actorName,
      resource: 'customer',
      resourceId: customerId,
      message: `${actorName} 更新了客户「${customerName}」`,
      data: { customerName },
    })
  }

  customerDeleted(actorId: number, actorName: string, customerId: number) {
    this.notify({
      type: NotificationType.CUSTOMER_DELETED,
      actorId,
      actorName,
      resource: 'customer',
      resourceId: customerId,
      message: `${actorName} 删除了客户 #${customerId}`,
    })
  }

  /**
   * Opportunity notifications
   */
  opportunityCreated(actorId: number, actorName: string, oppId: number, title: string) {
    this.notify({
      type: NotificationType.OPPORTUNITY_CREATED,
      actorId,
      actorName,
      resource: 'opportunity',
      resourceId: oppId,
      message: `${actorName} 创建了商机「${title}」`,
      data: { title },
    })
  }

  opportunityStageChanged(
    actorId: number,
    actorName: string,
    oppId: number,
    title: string,
    fromStage: string,
    toStage: string,
  ) {
    this.notify({
      type: NotificationType.OPPORTUNITY_STAGE_CHANGED,
      actorId,
      actorName,
      resource: 'opportunity',
      resourceId: oppId,
      message: `${actorName} 将商机「${title}」从 ${fromStage} 推进到 ${toStage}`,
      data: { title, fromStage, toStage },
    })
  }

  opportunityDeleted(actorId: number, actorName: string, oppId: number) {
    this.notify({
      type: NotificationType.OPPORTUNITY_DELETED,
      actorId,
      actorName,
      resource: 'opportunity',
      resourceId: oppId,
      message: `${actorName} 删除了商机 #${oppId}`,
    })
  }

  /**
   * Call record notifications
   */
  callRecordCreated(actorId: number, actorName: string, recordId: number) {
    this.notify({
      type: NotificationType.CALL_RECORD_CREATED,
      actorId,
      actorName,
      resource: 'call_record',
      resourceId: recordId,
      message: `${actorName} 记录了一次通话 #${recordId}`,
    })
  }

  callRecordDeleted(actorId: number, actorName: string, recordId: number) {
    this.notify({
      type: NotificationType.CALL_RECORD_DELETED,
      actorId,
      actorName,
      resource: 'call_record',
      resourceId: recordId,
      message: `${actorName} 删除了通话记录 #${recordId}`,
    })
  }

  /**
   * Send incoming call popup data to the specified agent (by userId).
   */
  incomingCallPopup(
    userId: number,
    payload: {
      phone: string
      customerId?: number
      contactId?: number
      popupData: Record<string, unknown>
    },
  ) {
    this.gateway.emitToUser(userId, 'INCOMING_CALL_POPUP', payload)
  }

  callSummaryCompleted(recordId: number) {
    this.notify({
      type: NotificationType.CALL_SUMMARY_COMPLETED,
      actorId: 0,
      actorName: 'AI 系统',
      resource: 'call_record',
      resourceId: recordId,
      message: `通话记录 #${recordId} 的 AI 摘要已生成`,
    })
  }

  /**
   * Knowledge article notifications
   */
  articleCreated(actorId: number, actorName: string, articleId: number, title: string) {
    this.notify({
      type: NotificationType.ARTICLE_CREATED,
      actorId,
      actorName,
      resource: 'article',
      resourceId: articleId,
      message: `${actorName} 发布了文章「${title}」`,
      data: { title },
    })
  }

  articleEmbeddingCompleted(articleId: number, title: string) {
    this.notify({
      type: NotificationType.ARTICLE_EMBEDDING_COMPLETED,
      actorId: 0,
      actorName: 'AI 系统',
      resource: 'article',
      resourceId: articleId,
      message: `文章「${title}」的向量索引已更新`,
      data: { title },
    })
  }

  /**
   * Announcement notifications
   */
  announcementPublished(actorId: number, announcementId: number, title: string) {
    this.notify({
      type: NotificationType.ANNOUNCEMENT_PUBLISHED,
      actorId,
      actorName: '系统公告',
      resource: 'announcement',
      resourceId: announcementId,
      message: `新公告「${title}」已发布`,
      data: { title },
    })
  }
}
