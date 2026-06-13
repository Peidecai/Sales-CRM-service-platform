/**
 * OfflineQueue — queue outbound requests when the device is offline
 *
 * - Max 50 items, stored at key `crm_offline_queue`
 * - Each item: { id, method, url, body, createdAt, retryCount }
 * - FIFO flush with concurrency 1
 * - Auto-flush on network reconnect
 * - Retry up to 3 times, then move to failed list
 * - Dedup by method+url+body hash (same request won't be queued twice)
 * - Expired items (>72h) auto-purged on load
 */

import { request } from '@/api/request'

const STORAGE_KEY = 'crm_offline_queue'
const FAILED_STORAGE_KEY = 'crm_offline_queue_failed'
const MAX_ITEMS = 50
const MAX_RETRIES = 3
const EXPIRY_MS = 72 * 60 * 60 * 1000 // 72 hours

export interface QueueItem {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  createdAt: number
  retryCount: number
}

export interface FlushResult {
  succeeded: number
  failed: number
  remaining: number
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** Simple hash for dedup: method + url + sorted body JSON */
function dedupKey(method: string, url: string, body?: Record<string, unknown>): string {
  const bodyStr = body ? JSON.stringify(body, Object.keys(body).sort()) : ''
  return `${method}:${url}:${bodyStr}`
}

function loadQueue(): QueueItem[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw) return []
    const items = JSON.parse(raw as string) as QueueItem[]

    // 过期请求可能引用已变化的客户/跟进状态，超过 72h 不再自动重放。
    const now = Date.now()
    const valid = items.filter((item) => now - item.createdAt < EXPIRY_MS)
    if (valid.length !== items.length) {
      saveQueue(valid)
    }
    return valid
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

function loadFailed(): QueueItem[] {
  try {
    const raw = uni.getStorageSync(FAILED_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw as string) as QueueItem[]
  } catch {
    return []
  }
}

function saveFailed(items: QueueItem[]): void {
  try {
    // Keep only last 20 failed items
    uni.setStorageSync(FAILED_STORAGE_KEY, JSON.stringify(items.slice(-20)))
  } catch {
    // Silently fail
  }
}

let isFlushing = false

export const offlineQueue = {
  /**
   * Push a request onto the offline queue.
   * Returns false if queue is full or if an identical request is already queued (dedup).
   */
  push(method: QueueItem['method'], url: string, body?: Record<string, unknown>): boolean {
    const queue = loadQueue()

    // Dedup: skip if identical request already queued
    const key = dedupKey(method, url, body)
    if (queue.some((item) => dedupKey(item.method, item.url, item.body) === key)) {
      console.log('[OfflineQueue] duplicate request skipped:', method, url)
      return false
    }

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
   * Flush the queue — process items FIFO with concurrency 1.
   * Returns a summary of succeeded/failed/remaining counts.
   */
  async flush(): Promise<FlushResult> {
    if (isFlushing) return { succeeded: 0, failed: 0, remaining: this.size() }
    isFlushing = true

    let succeeded = 0
    let failed = 0

    try {
      const queue = loadQueue()
      const failedItems = loadFailed()

      while (queue.length > 0) {
        const item = queue[0]!

        try {
          await request({
            url: item.url,
            method: item.method,
            data: item.body,
          })
          // Success — remove from queue
          queue.shift()
          saveQueue(queue)
          succeeded++
        } catch (err) {
          item.retryCount++
          if (item.retryCount >= MAX_RETRIES) {
            console.error('[OfflineQueue] max retries reached, moving to failed:', item.url, err)
            failedItems.push(item)
            queue.shift()
            saveQueue(queue)
            saveFailed(failedItems)
            failed++
          } else {
            // 首个失败项会阻塞后续 FIFO 项，保持用户操作顺序不被打乱。
            queue[0] = item
            saveQueue(queue)
            break
          }
        }
      }

      return { succeeded, failed, remaining: queue.length }
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

  /**
   * Get failed items (read-only)
   */
  getFailed(): QueueItem[] {
    return loadFailed()
  },

  /**
   * Clear all failed items
   */
  clearFailed(): void {
    saveFailed([])
  },

  /**
   * Check if a request is already queued (dedup check)
   */
  has(method: QueueItem['method'], url: string, body?: Record<string, unknown>): boolean {
    const key = dedupKey(method, url, body)
    return loadQueue().some((item) => dedupKey(item.method, item.url, item.body) === key)
  },
}

// Auto-flush on network reconnect
uni.onNetworkStatusChange((res) => {
  if (res.isConnected) {
    console.log('[OfflineQueue] Network restored, flushing queue...')
    offlineQueue.flush().then((result) => {
      if (result.succeeded > 0 || result.failed > 0) {
        const parts: string[] = []
        if (result.succeeded > 0) parts.push(`${result.succeeded} 条已同步`)
        if (result.failed > 0) parts.push(`${result.failed} 条失败`)
        uni.showToast({
          title: parts.join('，'),
          icon: 'none',
          duration: 2500,
        })
      }
    })
  }
})
