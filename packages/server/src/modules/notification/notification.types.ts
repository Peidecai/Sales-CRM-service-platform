/**
 * Notification event types emitted via WebSocket.
 */
export enum NotificationType {
  /** A new customer has been created */
  CUSTOMER_CREATED = 'customer:created',
  /** A customer has been updated */
  CUSTOMER_UPDATED = 'customer:updated',
  /** A customer has been deleted */
  CUSTOMER_DELETED = 'customer:deleted',

  /** A new opportunity has been created */
  OPPORTUNITY_CREATED = 'opportunity:created',
  /** An opportunity has been updated */
  OPPORTUNITY_UPDATED = 'opportunity:updated',
  /** An opportunity stage has been advanced */
  OPPORTUNITY_STAGE_CHANGED = 'opportunity:stage_changed',
  /** An opportunity has been deleted */
  OPPORTUNITY_DELETED = 'opportunity:deleted',

  /** A new call record has been created */
  CALL_RECORD_CREATED = 'call_record:created',
  /** A call record has been deleted */
  CALL_RECORD_DELETED = 'call_record:deleted',
  /** AI summary completed for a call record */
  CALL_SUMMARY_COMPLETED = 'call_record:summary_completed',

  /** A knowledge article has been created */
  ARTICLE_CREATED = 'article:created',
  /** Article embedding completed */
  ARTICLE_EMBEDDING_COMPLETED = 'article:embedding_completed',
}

export interface NotificationPayload {
  type: NotificationType
  /** User ID who triggered the action (0 for system actions) */
  actorId: number
  /** Actor display name */
  actorName: string
  /** Resource type (customer, opportunity, etc.) */
  resource: string
  /** Resource ID */
  resourceId: number
  /** Human-readable summary */
  message: string
  /** Timestamp */
  timestamp: string
  /** Optional extra data */
  data?: Record<string, unknown>
}
