import { describe, it, expect } from 'vitest'
import { haversineDistance, formatDistance } from './geo'

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    const distance = haversineDistance(39.9042, 116.4074, 39.9042, 116.4074)
    expect(distance).toBe(0)
  })

  it('calculates Beijing to Shanghai as ~1068 km', () => {
    const distance = haversineDistance(39.9042, 116.4074, 31.2304, 121.4737)
    const distanceKm = distance / 1000
    expect(distanceKm).toBeGreaterThan(1050)
    expect(distanceKm).toBeLessThan(1090)
  })

  it('handles small distances in meters range', () => {
    // Two points ~111m apart (0.001 degree latitude at equator)
    const distance = haversineDistance(0, 0, 0.001, 0)
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(120)
  })

  it('handles negative coordinates (Southern/Western hemisphere)', () => {
    // São Paulo (-23.5505, -46.6333) to Buenos Aires (-34.6037, -58.3816)
    const distance = haversineDistance(-23.5505, -46.6333, -34.6037, -58.3816)
    const distanceKm = distance / 1000
    expect(distanceKm).toBeGreaterThan(1650)
    expect(distanceKm).toBeLessThan(1700)
  })

  it('is symmetric: distance A->B equals B->A', () => {
    const ab = haversineDistance(39.9042, 116.4074, 31.2304, 121.4737)
    const ba = haversineDistance(31.2304, 121.4737, 39.9042, 116.4074)
    expect(ab).toBeCloseTo(ba, 10)
  })
})

describe('formatDistance', () => {
  it('shows meters for distances below 1000m', () => {
    expect(formatDistance(500)).toBe('500m')
  })

  it('shows km with 1 decimal for 1000m+', () => {
    expect(formatDistance(1500)).toBe('1.5km')
  })

  it('handles boundary: 999m shows meters, 1000m shows km', () => {
    expect(formatDistance(999)).toBe('999m')
    expect(formatDistance(1000)).toBe('1.0km')
  })
})
