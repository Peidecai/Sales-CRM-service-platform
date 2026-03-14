import { ref, onMounted, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { ElNotification } from 'element-plus'
import { useUserStore } from '@/stores/user'

export interface NotificationPayload {
  type: string
  /** Unique event ID for deduplication */
  eventId?: string
  actorId: number
  actorName: string
  resource: string
  resourceId: number
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

const NOTIFICATION_STYLE: Record<
  string,
  { title: string; type: 'success' | 'warning' | 'info' | 'error' }
> = {
  'customer:created': { title: '客户动态', type: 'success' },
  'customer:updated': { title: '客户动态', type: 'info' },
  'customer:deleted': { title: '客户动态', type: 'warning' },
  'opportunity:created': { title: '商机动态', type: 'success' },
  'opportunity:updated': { title: '商机动态', type: 'info' },
  'opportunity:stage_changed': { title: '商机推进', type: 'success' },
  'opportunity:deleted': { title: '商机动态', type: 'warning' },
  'call_record:created': { title: '通话记录', type: 'info' },
  'call_record:deleted': { title: '通话记录', type: 'warning' },
  'call_record:summary_completed': { title: 'AI 摘要', type: 'success' },
  'article:created': { title: '知识库', type: 'success' },
  'article:embedding_completed': { title: '向量索引', type: 'info' },
}

// Module-level singleton state
let socket: Socket | null = null
const connected = ref(false)
const notifications = ref<NotificationPayload[]>([])
const incomingCallPopup = ref<{
  phone: string
  customerId?: number
  contactId?: number
  popupData: Record<string, unknown>
} | null>(null)
let consumerCount = 0

/** Dedup: track processed event IDs to ignore duplicates from reconnection / broadcast storms */
const processedEventIds = new Set<string>()
const PROCESSED_EVENT_IDS_MAX = 1000

function connectNotificationSocket(token: string | null, currentUserId?: number) {
  if (!token || socket) return

  socket = io('/ws/notifications', {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
  })

  socket.on('connect', () => {
    connected.value = true
  })

  socket.on('disconnect', () => {
    connected.value = false
  })

  socket.on(
    'INCOMING_CALL_POPUP',
    (payload: {
      phone: string
      customerId?: number
      contactId?: number
      popupData: Record<string, unknown>
    }) => {
      incomingCallPopup.value = payload
    },
  )

  socket.on('notification', (payload: NotificationPayload) => {
    if (currentUserId !== undefined && payload.actorId === currentUserId) return

    // Dedup by eventId — silently ignore duplicate notifications
    if (payload.eventId) {
      if (processedEventIds.has(payload.eventId)) return
      processedEventIds.add(payload.eventId)
      // Evict oldest entries when the set grows too large
      if (processedEventIds.size > PROCESSED_EVENT_IDS_MAX) {
        const iter = processedEventIds.values()
        // Delete the first (oldest) half
        const deleteCount = Math.floor(PROCESSED_EVENT_IDS_MAX / 2)
        for (let i = 0; i < deleteCount; i++) {
          const oldest = iter.next()
          if (oldest.done) break
          processedEventIds.delete(oldest.value)
        }
      }
    }

    notifications.value.unshift(payload)
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }

    const style = NOTIFICATION_STYLE[payload.type] ?? { title: '系统通知', type: 'info' as const }
    ElNotification({
      title: style.title,
      message: payload.message,
      type: style.type,
      duration: 4500,
      position: 'bottom-right',
    })
  })

  socket.on('connect_error', () => {
    connected.value = false
  })
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  connected.value = false
}

export function __resetNotificationStateForTest() {
  disconnectNotificationSocket()
  notifications.value = []
  processedEventIds.clear()
  consumerCount = 0
}

/**
 * Composable for real-time WebSocket notifications.
 */
export function useNotification() {
  const userStore = useUserStore()

  function connect() {
    if (!userStore.isLoggedIn) return
    connectNotificationSocket(userStore.token, userStore.userInfo?.id)
  }

  function disconnect() {
    disconnectNotificationSocket()
  }

  function clearNotifications() {
    notifications.value = []
  }

  onMounted(() => {
    consumerCount += 1
    connect()
  })

  onUnmounted(() => {
    consumerCount = Math.max(consumerCount - 1, 0)
    // Connection lifecycle is managed by user store logout(), not component lifecycle
  })

  return {
    connected,
    notifications,
    incomingCallPopup,
    connect,
    disconnect,
    clearNotifications,
  }
}
