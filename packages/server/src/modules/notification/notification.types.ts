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

  /** Follow-up reminder for today's tasks */
  FOLLOW_UP_REMINDER = 'follow_up:reminder',
  /** Follow-up overdue warning */
  FOLLOW_UP_OVERDUE = 'follow_up:overdue',

  /** Customer import progress update */
  IMPORT_PROGRESS = 'import:progress',
  /** Customer import completed */
  IMPORT_COMPLETED = 'import:completed',

  /** Incoming call popup for agent workspace */
  INCOMING_CALL_POPUP = 'INCOMING_CALL_POPUP',

  /** Background queue job failed after all retries */
  QUEUE_JOB_FAILED = 'queue:job_failed',

  /** A new announcement has been published */
  ANNOUNCEMENT_PUBLISHED = 'announcement:published',
}

export interface NotificationPayload {
  type: NotificationType
  /** Unique event ID (UUID) — assigned by gateway before emitting */
  eventId?: string
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
