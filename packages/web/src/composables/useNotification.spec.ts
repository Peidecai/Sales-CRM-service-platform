import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { useUserStore } from '@/stores/user'

const { ioMock, notificationMock } = vi.hoisted(() => ({
  ioMock: vi.fn(),
  notificationMock: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: ioMock,
}))

vi.mock('element-plus', () => ({
  ElNotification: notificationMock,
}))

import {
  useNotification,
  __resetNotificationStateForTest,
  type NotificationPayload,
} from './useNotification'

type SocketHandlers = Record<string, (...args: unknown[]) => void>

function createMockSocket(connected = false) {
  const handlers: SocketHandlers = {}
  const socket = {
    connected,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb
      return socket
    }),
    disconnect: vi.fn(),
    handlers,
  }
  return socket
}

function mountUseNotification(pinia: Pinia) {
  let api: ReturnType<typeof useNotification> | null = null
  const TestComp = defineComponent({
    setup() {
      api = useNotification()
      return {}
    },
    template: '<div />',
  })
  const wrapper = mount(TestComp, {
    global: {
      plugins: [pinia],
    },
  })
  return {
    wrapper,
    api: api as unknown as ReturnType<typeof useNotification>,
  }
}

describe('useNotification', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    ioMock.mockReset()
    notificationMock.mockReset()
    __resetNotificationStateForTest()
  })

  it('does not connect when user is not logged in', async () => {
    const { wrapper, api } = mountUseNotification(pinia)
    await nextTick()

    expect(ioMock).not.toHaveBeenCalled()

    // No socket created, disconnect should be a no-op
    api.disconnect()
    expect(api.connected.value).toBe(false)

    wrapper.unmount()
  })

  it('connects and handles lifecycle and notification events', async () => {
    const userStore = useUserStore()
    userStore.token = 'token-1'
    userStore.userInfo = { id: 101, username: 'admin', name: 'Admin', role: 'admin' }

    const socket = createMockSocket(false)
    ioMock.mockReturnValue(socket)

    const { wrapper, api } = mountUseNotification(pinia)
    await nextTick()

    expect(ioMock).toHaveBeenCalledWith(
      '/ws/notifications',
      expect.objectContaining({
        auth: { token: 'token-1' },
        reconnection: true,
      }),
    )

    socket.handlers.connect?.()
    expect(api.connected.value).toBe(true)

    // Self notifications should be ignored
    const selfPayload: NotificationPayload = {
      type: 'customer:updated',
      actorId: 101,
      actorName: 'Admin',
      resource: 'customer',
      resourceId: 1,
      message: 'self event',
      timestamp: new Date().toISOString(),
    }
    socket.handlers.notification?.(selfPayload)
    expect(api.notifications.value).toHaveLength(0)
    expect(notificationMock).not.toHaveBeenCalled()

    // Non-self notification should be appended with mapped style
    const mappedPayload: NotificationPayload = {
      ...selfPayload,
      actorId: 999,
      type: 'customer:created',
      message: 'customer created',
    }
    socket.handlers.notification?.(mappedPayload)
    expect(api.notifications.value).toHaveLength(1)
    expect(notificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: 'customer created',
      }),
    )

    // Unknown type should use default style
    const unknownPayload: NotificationPayload = {
      ...mappedPayload,
      type: 'unknown:event',
      message: 'unknown type',
    }
    socket.handlers.notification?.(unknownPayload)
    expect(notificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        message: 'unknown type',
      }),
    )

    // Keep max 50 items
    for (let i = 0; i < 60; i++) {
      socket.handlers.notification?.({
        ...mappedPayload,
        type: 'opportunity:updated',
        message: `event-${i}`,
      } as NotificationPayload)
    }
    expect(api.notifications.value).toHaveLength(50)

    api.clearNotifications()
    expect(api.notifications.value).toEqual([])

    socket.handlers.disconnect?.()
    expect(api.connected.value).toBe(false)

    socket.handlers.connect_error?.()
    expect(api.connected.value).toBe(false)

    // Make existing socket report connected and call connect again => should short-circuit
    socket.connected = true
    api.connect()
    expect(ioMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    api.disconnect()
    expect(socket.disconnect).toHaveBeenCalled()
    expect(api.connected.value).toBe(false)
  })

  it('uses a singleton socket across multiple consumers', async () => {
    const userStore = useUserStore()
    userStore.token = 'token-2'
    userStore.userInfo = { id: 201, username: 'manager', name: 'Manager', role: 'manager' }

    const socket = createMockSocket(false)
    ioMock.mockReturnValue(socket)

    const first = mountUseNotification(pinia)
    await nextTick()
    const second = mountUseNotification(pinia)
    await nextTick()

    expect(ioMock).toHaveBeenCalledTimes(1)
    expect(first.api.notifications).toBe(second.api.notifications)
    expect(first.api.connected).toBe(second.api.connected)

    first.wrapper.unmount()
    await nextTick()
    expect(socket.disconnect).not.toHaveBeenCalled()

    second.wrapper.unmount()
    second.api.disconnect()
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
  })
})
