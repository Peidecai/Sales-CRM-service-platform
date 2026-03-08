import { Injectable } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { NotificationType, NotificationPayload } from './notification.types'

/**
 * Service layer for sending notifications.
 * Inject this into any business service that needs to push real-time events.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly gateway: NotificationGateway) {}

  /**
   * Broadcast a business event to all connected clients.
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
  }

  /**
   * Send a notification to a specific user only.
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
}
