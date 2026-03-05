import { ref, onMounted, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { ElNotification } from 'element-plus'
import { useUserStore } from '@/stores/user'

export interface NotificationPayload {
  type: string
  actorId: number
  actorName: string
  resource: string
  resourceId: number
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

/** Map notification type → icon and color */
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
  'call_record:summary_completed': { title: 'AI 摘要', type: 'success' },
  'article:created': { title: '知识库', type: 'success' },
  'article:embedding_completed': { title: '向量索引', type: 'info' },
}

/**
 * Composable for real-time WebSocket notifications.
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { useNotification } from '@/composables/useNotification'
 * const { connected, notifications } = useNotification()
 * </script>
 * ```
 */
export function useNotification() {
  const userStore = useUserStore()
  const connected = ref(false)
  const notifications = ref<NotificationPayload[]>([])
  let socket: Socket | null = null

  function connect() {
    if (socket?.connected) return
    if (!userStore.isLoggedIn) return

    socket = io('/ws/notifications', {
      transports: ['websocket', 'polling'],
      auth: {
        userId: userStore.userInfo?.id,
        token: userStore.token,
      },
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

    socket.on('notification', (payload: NotificationPayload) => {
      // Skip notifications from self
      if (payload.actorId === userStore.userInfo?.id) return

      // Add to list (keep last 50)
      notifications.value.unshift(payload)
      if (notifications.value.length > 50) {
        notifications.value = notifications.value.slice(0, 50)
      }

      // Show desktop notification
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

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
      connected.value = false
    }
  }

  function clearNotifications() {
    notifications.value = []
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    notifications,
    connect,
    disconnect,
    clearNotifications,
  }
}
