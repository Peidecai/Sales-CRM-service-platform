import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/request', () => ({
  request: vi.fn(),
}))

import { request } from '@/api/request'
import type { FlushResult } from './offline-queue'

const mockedRequest = request as ReturnType<typeof vi.fn>

// Must re-import fresh module per test to reset `isFlushing`
async function loadModule() {
  return await import('./offline-queue')
}

let offlineQueue: Awaited<ReturnType<typeof loadModule>>['offlineQueue']

beforeEach(async () => {
  vi.resetModules()
  mockedRequest.mockReset()
  const mod = await loadModule()
  offlineQueue = mod.offlineQueue
})

describe('offlineQueue', () => {
  describe('push', () => {
    it('adds item to queue and returns true', () => {
      const result = offlineQueue.push('POST', '/api/v1/follow-up', { note: 'test' })
      expect(result).toBe(true)
      expect(offlineQueue.size()).toBe(1)
    })

    it('returns false for duplicate method+url+body', () => {
      offlineQueue.push('POST', '/api/v1/follow-up', { note: 'test' })
      const result = offlineQueue.push('POST', '/api/v1/follow-up', { note: 'test' })
      expect(result).toBe(false)
      expect(offlineQueue.size()).toBe(1)
    })

    it('allows same url with different body', () => {
      offlineQueue.push('POST', '/api/v1/follow-up', { note: 'a' })
      const result = offlineQueue.push('POST', '/api/v1/follow-up', { note: 'b' })
      expect(result).toBe(true)
      expect(offlineQueue.size()).toBe(2)
    })

    it('returns false when queue is full (50 items)', () => {
      for (let i = 0; i < 50; i++) {
        offlineQueue.push('POST', `/api/v1/item/${i}`)
      }
      expect(offlineQueue.size()).toBe(50)
      const result = offlineQueue.push('POST', '/api/v1/item/overflow')
      expect(result).toBe(false)
      expect(offlineQueue.size()).toBe(50)
    })
  })

  describe('size', () => {
    it('returns correct count', () => {
      expect(offlineQueue.size()).toBe(0)
      offlineQueue.push('GET', '/api/v1/a')
      offlineQueue.push('GET', '/api/v1/b')
      expect(offlineQueue.size()).toBe(2)
    })
  })

  describe('has', () => {
    it('returns true for existing request', () => {
      offlineQueue.push('POST', '/api/v1/follow-up', { note: 'x' })
      expect(offlineQueue.has('POST', '/api/v1/follow-up', { note: 'x' })).toBe(true)
    })

    it('returns false for non-existing request', () => {
      expect(offlineQueue.has('POST', '/api/v1/follow-up')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('returns all queued items', () => {
      offlineQueue.push('GET', '/api/v1/a')
      offlineQueue.push('POST', '/api/v1/b', { x: 1 })
      const items = offlineQueue.getAll()
      expect(items).toHaveLength(2)
      expect(items[0]!.url).toBe('/api/v1/a')
      expect(items[1]!.url).toBe('/api/v1/b')
    })
  })

  describe('remove', () => {
    it('removes item by id', () => {
      offlineQueue.push('GET', '/api/v1/a')
      offlineQueue.push('GET', '/api/v1/b')
      const items = offlineQueue.getAll()
      offlineQueue.remove(items[0]!.id)
      expect(offlineQueue.size()).toBe(1)
      expect(offlineQueue.getAll()[0]!.url).toBe('/api/v1/b')
    })
  })

  describe('flush', () => {
    it('returns zeroes when queue is empty', async () => {
      const result = await offlineQueue.flush()
      expect(result).toEqual({ succeeded: 0, failed: 0, remaining: 0 })
    })

    it('removes item on successful request', async () => {
      mockedRequest.mockResolvedValueOnce({ code: 0 })
      offlineQueue.push('POST', '/api/v1/follow-up', { note: 'ok' })

      const result = await offlineQueue.flush()

      expect(result).toEqual({ succeeded: 1, failed: 0, remaining: 0 })
      expect(offlineQueue.size()).toBe(0)
      expect(mockedRequest).toHaveBeenCalledWith({
        url: '/api/v1/follow-up',
        method: 'POST',
        data: { note: 'ok' },
      })
    })

    it('stops flushing on request failure with retryCount < 3', async () => {
      mockedRequest.mockRejectedValueOnce(new Error('network'))
      offlineQueue.push('POST', '/api/v1/follow-up', { note: 'fail' })

      const result = await offlineQueue.flush()

      expect(result).toEqual({ succeeded: 0, failed: 0, remaining: 1 })
      expect(offlineQueue.size()).toBe(1)
      // retryCount should have incremented
      expect(offlineQueue.getAll()[0]!.retryCount).toBe(1)
    })

    it('moves item to failed list after max retries (3)', async () => {
      mockedRequest.mockRejectedValue(new Error('network'))
      offlineQueue.push('POST', '/api/v1/follow-up', { note: 'doomed' })

      // Flush 3 times to reach max retries
      await offlineQueue.flush() // retryCount 0 -> 1, breaks
      await offlineQueue.flush() // retryCount 1 -> 2, breaks
      const result = await offlineQueue.flush() // retryCount 2 -> 3, moves to failed

      expect(result).toEqual({ succeeded: 0, failed: 1, remaining: 0 })
      expect(offlineQueue.size()).toBe(0)
      expect(offlineQueue.getFailed()).toHaveLength(1)
      expect(offlineQueue.getFailed()[0]!.url).toBe('/api/v1/follow-up')
    })

    it('returns immediately if another flush is in progress', async () => {
      offlineQueue.push('POST', '/api/v1/a')
      // Make request hang
      mockedRequest.mockReturnValue(new Promise(() => {}))

      const flushPromise = offlineQueue.flush()
      // Second flush while first is running
      const concurrent = await offlineQueue.flush()

      expect(concurrent).toEqual({ succeeded: 0, failed: 0, remaining: 1 })

      // Clean up: we can't resolve the hanging promise, but module will be re-imported next test
      void flushPromise
    })
  })

  describe('getFailed / clearFailed', () => {
    it('failed items are accessible and clearable', async () => {
      mockedRequest.mockRejectedValue(new Error('err'))
      offlineQueue.push('POST', '/api/v1/x')
      await offlineQueue.flush() // retry 1
      await offlineQueue.flush() // retry 2
      await offlineQueue.flush() // retry 3 -> failed

      expect(offlineQueue.getFailed()).toHaveLength(1)

      offlineQueue.clearFailed()
      expect(offlineQueue.getFailed()).toHaveLength(0)
    })
  })

  describe('network reconnect callback', () => {
    it('registers uni.onNetworkStatusChange and flushes on reconnect', async () => {
      // The module import triggers uni.onNetworkStatusChange(callback)
      expect(uni.onNetworkStatusChange).toHaveBeenCalled()

      // Add an item and set up request mock
      offlineQueue.push('POST', '/api/v1/sync')
      mockedRequest.mockResolvedValueOnce({ code: 0 })

      // Extract the captured callback and invoke it
      const callback = vi.mocked(uni.onNetworkStatusChange).mock.calls[0]![0]
      callback({ isConnected: true, networkType: 'wifi' } as UniApp.OnNetworkStatusChangeSuccess)

      // flush is async — wait for microtask queue
      await vi.waitFor(() => {
        expect(offlineQueue.size()).toBe(0)
      })
    })
  })
})
