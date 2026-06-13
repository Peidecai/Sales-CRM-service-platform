import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CACHE_PREFIX, CACHE_TTL, cacheStore } from './cache-store'

describe('CACHE_PREFIX', () => {
  it('exports correct prefix values', () => {
    expect(CACHE_PREFIX.USER).toBe('crm_cache_user:')
    expect(CACHE_PREFIX.CUSTOMERS).toBe('crm_cache_customers:')
    expect(CACHE_PREFIX.DICT).toBe('crm_cache_dict:')
  })
})

describe('CACHE_TTL', () => {
  it('exports correct TTL values in seconds', () => {
    expect(CACHE_TTL.USER).toBe(1800)
    expect(CACHE_TTL.CUSTOMERS).toBe(900)
    expect(CACHE_TTL.DICT).toBe(86400)
  })
})

describe('cacheStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('set + get round-trips a string value', () => {
    cacheStore.set('key1', 'hello', 60)
    expect(cacheStore.get('key1')).toBe('hello')
  })

  it('set + get round-trips an object value', () => {
    const data = { name: 'Alice', roles: ['admin', 'sales'], count: 42 }
    cacheStore.set('obj-key', data, 120)
    expect(cacheStore.get('obj-key')).toEqual(data)
  })

  it('get returns null for a missing key', () => {
    expect(cacheStore.get('nonexistent')).toBeNull()
  })

  it('get returns null and removes key when TTL has expired', () => {
    cacheStore.set('expire-key', 'value', 60)

    // Advance past the 60-second TTL
    vi.advanceTimersByTime(61_000)

    expect(cacheStore.get('expire-key')).toBeNull()
    expect(uni.removeStorageSync).toHaveBeenCalledWith('expire-key')
  })

  it('get returns data when TTL has not yet expired', () => {
    cacheStore.set('fresh-key', 'still-valid', 60)

    // Advance to just before expiry
    vi.advanceTimersByTime(59_000)

    expect(cacheStore.get('fresh-key')).toBe('still-valid')
  })

  it('set swallows exception and logs warning when storage throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(uni.setStorageSync).mockImplementationOnce(() => {
      throw new Error('storage full')
    })

    expect(() => cacheStore.set('fail-key', 'data', 60)).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      '[CacheStore] set failed:',
      'fail-key',
      expect.any(Error),
    )
    warnSpy.mockRestore()
  })

  it('get returns null when stored JSON is corrupted', () => {
    uni.setStorageSync('bad-json', '{not valid json!!!')
    expect(cacheStore.get('bad-json')).toBeNull()
  })

  it('remove calls removeStorageSync with the key', () => {
    cacheStore.set('rm-key', 'value', 60)
    cacheStore.remove('rm-key')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('rm-key')
  })

  it('remove swallows exception when removeStorageSync throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(uni.removeStorageSync).mockImplementationOnce(() => {
      throw new Error('remove failed')
    })

    expect(() => cacheStore.remove('any-key')).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      '[CacheStore] remove failed:',
      'any-key',
      expect.any(Error),
    )
    warnSpy.mockRestore()
  })

  it('clear removes only keys matching the given prefix', () => {
    cacheStore.set(`${CACHE_PREFIX.USER}profile`, 'u1', CACHE_TTL.USER)
    cacheStore.set(`${CACHE_PREFIX.USER}settings`, 'u2', CACHE_TTL.USER)
    cacheStore.set(`${CACHE_PREFIX.DICT}status`, 'd1', CACHE_TTL.DICT)

    cacheStore.clear(CACHE_PREFIX.USER)

    // User keys should be removed
    expect(uni.removeStorageSync).toHaveBeenCalledWith(`${CACHE_PREFIX.USER}profile`)
    expect(uni.removeStorageSync).toHaveBeenCalledWith(`${CACHE_PREFIX.USER}settings`)

    // Dict key should still exist
    expect(cacheStore.get(`${CACHE_PREFIX.DICT}status`)).toBe('d1')
  })

  it('clear with empty storage works without error', () => {
    expect(() => cacheStore.clear(CACHE_PREFIX.CUSTOMERS)).not.toThrow()
  })
})
