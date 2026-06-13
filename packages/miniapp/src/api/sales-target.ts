/**
 * Sales Target API — mirrors PC web API signatures
 */
import { http } from './request'
import type { ApiResponse } from '@crm/shared'
import { TargetScope, TargetPeriod, TargetMetricType } from '@crm/shared'

export { TargetScope, TargetPeriod, TargetMetricType }

export interface SalesTargetVO {
  id: number
  name: string
  scope: TargetScope
  period: TargetPeriod
  metricType: TargetMetricType
  targetValue: number
  achievedValue: number
  year: number
  quarter: number | null
  month: number | null
  startDate: string
  endDate: string
  assignedUserId: number | null
  teamId: string | null
  parentTargetId: number | null
  createdAt: string
  updatedAt: string
  deleted: boolean
  children?: SalesTargetVO[]
}

export interface OverviewItem {
  metricType: TargetMetricType
  targetValue: number
  achievedValue: number
  achievementRate: number
}

export interface RankingItem {
  id: number
  userId: number
  userName: string
  period: TargetPeriod
  metricType: TargetMetricType
  metricValue: number
  rank: number
  snapshotDate: string
  scope: TargetScope
  year: number
  quarter: number | null
  month: number | null
}

export const salesTargetApi = {
  getOverview(year?: number): Promise<ApiResponse<OverviewItem[]>> {
    return http.get('/sales-targets/overview', year ? { year } : {})
  },

  getSalesRanking(params: {
    metricType: TargetMetricType
    period: TargetPeriod
    year: number
    quarter?: number
    month?: number
    limit?: number
  }): Promise<ApiResponse<RankingItem[]>> {
    return http.get('/sales-targets/ranking/sales', params as unknown as Record<string, unknown>)
  },

  getDetail(id: number): Promise<ApiResponse<SalesTargetVO>> {
    return http.get(`/sales-targets/${id}`)
  },
}
