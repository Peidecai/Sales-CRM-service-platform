/**
 * Route API — route planning & optimization
 */
import { http } from './request'
import type { ApiResponse } from '@crm/shared'

export interface OptimizeRouteParams {
  customerIds: number[]
  startLatitude?: number
  startLongitude?: number
}

export interface RoutePoint {
  customerId: number
  customerName: string
  address: string
  latitude: number
  longitude: number
  distanceFromPrev: number
  order: number
}

export interface OptimizedRoute {
  points: RoutePoint[]
  totalDistance: number
}

export const routeApi = {
  /**
   * Optimize visit route (greedy nearest-neighbor TSP)
   */
  optimize(data: OptimizeRouteParams): Promise<ApiResponse<OptimizedRoute>> {
    return http.post('/route/optimize', data as unknown as Record<string, unknown>)
  },
}
