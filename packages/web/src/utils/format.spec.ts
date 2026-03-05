import { describe, it, expect } from 'vitest'
import { formatDate, formatDuration, formatAmount } from './format'

describe('formatDate', () => {
  it('should format ISO datetime string to "YYYY-MM-DD HH:mm"', () => {
    // Use a fixed UTC string and check parts to avoid timezone issues
    const result = formatDate('2025-03-01T10:30:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })

  it('should return empty string for null-like input', () => {
    expect(formatDate(null as unknown as string)).toBe('')
    expect(formatDate(undefined as unknown as string)).toBe('')
  })

  it('should pad single-digit month and day', () => {
    const result = formatDate('2025-01-05T08:05:00Z')
    // Should contain zero-padded month and day
    expect(result).toContain('2025-01')
    expect(result).toContain('-05')
    // Verify output follows the format pattern
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})

describe('formatDuration', () => {
  it('should format seconds into "X分Y秒"', () => {
    expect(formatDuration(125)).toBe('2分5秒')
  })

  it('should handle exact minutes (no remaining seconds)', () => {
    expect(formatDuration(120)).toBe('2分0秒')
  })

  it('should handle less than a minute', () => {
    expect(formatDuration(45)).toBe('0分45秒')
  })

  it('should return "0分0秒" for zero', () => {
    expect(formatDuration(0)).toBe('0分0秒')
  })

  it('should return "0分0秒" for negative values', () => {
    expect(formatDuration(-10)).toBe('0分0秒')
  })

  it('should return "0分0秒" for null/undefined', () => {
    expect(formatDuration(null as unknown as number)).toBe('0分0秒')
    expect(formatDuration(undefined as unknown as number)).toBe('0分0秒')
  })

  it('should handle large values', () => {
    expect(formatDuration(3661)).toBe('61分1秒')
  })
})

describe('formatAmount', () => {
  it('should format number with two decimal places', () => {
    expect(formatAmount(50000)).toBe('50,000.00')
  })

  it('should format small number', () => {
    expect(formatAmount(1.5)).toBe('1.50')
  })

  it('should return "0" for null', () => {
    expect(formatAmount(null as unknown as number)).toBe('0')
  })

  it('should format zero', () => {
    expect(formatAmount(0)).toBe('0.00')
  })

  it('should handle large numbers with thousand separators', () => {
    const result = formatAmount(1234567.89)
    expect(result).toContain('1,234,567.89')
  })

  it('should handle negative amounts', () => {
    const result = formatAmount(-999.99)
    expect(result).toContain('999.99')
  })
})
