import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useThrottle } from './throttle'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('first call executes immediately and returns result', async () => {
    const fn = vi.fn().mockResolvedValue('hello')
    const { run } = useThrottle(fn, 1000)

    const result = await run()

    expect(fn).toHaveBeenCalledOnce()
    expect(result).toBe('hello')
  })

  it('second call within delay window returns undefined', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const { run } = useThrottle(fn, 1000)

    await run()
    vi.advanceTimersByTime(500)
    const second = await run()

    expect(fn).toHaveBeenCalledOnce()
    expect(second).toBeUndefined()
  })

  it('call after delay has passed executes normally', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const { run } = useThrottle(fn, 1000)

    await run()
    vi.advanceTimersByTime(1000)
    const second = await run()

    expect(fn).toHaveBeenCalledTimes(2)
    expect(second).toBe('result')
  })

  it('loading.value is true during async execution', async () => {
    let resolvePromise: (value: string) => void
    const fn = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolvePromise = resolve }),
    )
    const { loading, run } = useThrottle(fn, 1000)

    expect(loading.value).toBe(false)

    const promise = run()
    // loading should be true while awaiting
    expect(loading.value).toBe(true)

    resolvePromise!('done')
    await promise

    expect(loading.value).toBe(false)
  })

  it('loading.value is false after completion', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    const { loading, run } = useThrottle(fn, 1000)

    await run()

    expect(loading.value).toBe(false)
  })

  it('concurrent call while previous is still running returns undefined', async () => {
    let resolvePromise: (value: string) => void
    const fn = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolvePromise = resolve }),
    )
    const { run } = useThrottle(fn, 1000)

    const firstPromise = run()
    // fn is still running (loading=true), so second call should be blocked
    const second = await run()

    expect(second).toBeUndefined()
    expect(fn).toHaveBeenCalledOnce()

    resolvePromise!('first')
    await firstPromise
  })

  it('error in async fn still resets loading to false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    const { loading, run } = useThrottle(fn, 1000)

    await expect(run()).rejects.toThrow('fail')
    expect(loading.value).toBe(false)
  })
})
