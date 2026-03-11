/**
 * OfflineQueue — queue outbound requests when the device is offline
 *
 * - Max 50 items, stored at key `crm_offline_queue`
 * - Each item: { id, method, url, body, createdAt, retryCount }
 * - FIFO flush with concurrency 1
 * - Auto-flush on network reconnect
 * - Retry up to 3 times, then mark as failed
 */

import { request } from '@/api/request'

const STORAGE_KEY = 'crm_offline_queue'
const MAX_ITEMS = 50
const MAX_RETRIES = 3

export interface QueueItem {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  createdAt: number
  retryCount: number
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadQueue(): QueueItem[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw as string) as QueueItem[]
  } catch {
    return []
  }
}

function saveQueue(queue: QueueItem[]): void {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(queue))
  } catch (e) {
    console.warn('[OfflineQueue] save failed:', e)
  }
}

let isFlushing = false

export const offlineQueue = {
  /**
   * Push a request onto the offline queue
   */
  push(method: QueueItem['method'], url: string, body?: Record<string, unknown>): boolean {
    const queue = loadQueue()
    if (queue.length >= MAX_ITEMS) {
      console.warn('[OfflineQueue] queue full, dropping request')
      return false
    }

    const item: QueueItem = {
      id: generateId(),
      method,
      url,
      body,
      createdAt: Date.now(),
      retryCount: 0,
    }

    queue.push(item)
    saveQueue(queue)
    return true
  },

  /**
   * Flush the queue — process items FIFO with concurrency 1
   */
  async flush(): Promise<void> {
    if (isFlushing) return
    isFlushing = true

    try {
      let queue = loadQueue()

      while (queue.length > 0) {
        const item = queue[0]

        try {
          await request({
            url: item.url,
            method: item.method,
            data: item.body,
          })
          // Success — remove from queue
          queue.shift()
          saveQueue(queue)
        } catch (err) {
          item.retryCount++
          if (item.retryCount >= MAX_RETRIES) {
            console.error('[OfflineQueue] max retries reached, discarding:', item.url, err)
            queue.shift()
            saveQueue(queue)
          } else {
            // Update retry count and stop flushing (will retry next time)
            queue[0] = item
            saveQueue(queue)
            break
          }
        }
      }
    } finally {
      isFlushing = false
    }
  },

  /**
   * Remove a specific item by id
   */
  remove(id: string): void {
    const queue = loadQueue().filter((item) => item.id !== id)
    saveQueue(queue)
  },

  /**
   * Get current queue size
   */
  size(): number {
    return loadQueue().length
  },

  /**
   * Get all queued items (read-only)
   */
  getAll(): QueueItem[] {
    return loadQueue()
  },
}

// Auto-flush on network reconnect
uni.onNetworkStatusChange((res) => {
  if (res.isConnected) {
    console.log('[OfflineQueue] Network restored, flushing queue...')
    offlineQueue.flush()
  }
})
