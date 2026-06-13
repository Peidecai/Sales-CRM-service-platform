import request from './request'
import type { ApiResponse, PageResult } from './types'
import { TargetScope, TargetPeriod, TargetMetricType } from '@crm/shared'

export { TargetScope, TargetPeriod, TargetMetricType }

// ── VO Types ────────────────────────────────────────────────────────────

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

export interface AchievementInfo {
  target: SalesTargetVO
  achievementRate: number
  remainingValue: number
  daysLeft: number
  dailyRequired: number
}

export interface ForecastInfo {
  target: SalesTargetVO
  achievementRate: number
  forecastValue: number
  forecastRate: number
  onTrack: boolean
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

export interface TeamRankingItem {
  teamId: string
  totalValue: number
  rank: number
}

// ── Query Params ────────────────────────────────────────────────────────

export interface SalesTargetQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  scope?: TargetScope
  period?: TargetPeriod
  metricType?: TargetMetricType
  year?: number
  assignedUserId?: number
}

export interface CreateSalesTargetParams {
  name: string
  scope: TargetScope
  period: TargetPeriod
  metricType: TargetMetricType
  targetValue: number
  year: number
  quarter?: number
  month?: number
  startDate: string
  endDate: string
  assignedUserId?: number
  teamId?: string
  parentTargetId?: number
}

export type UpdateSalesTargetParams = Partial<CreateSalesTargetParams>

export interface DecomposeItem {
  assignedUserId?: number
  teamId?: string
  targetValue: number
}

// ── API ─────────────────────────────────────────────────────────────────

export const salesTargetApi = {
  getList(params: SalesTargetQueryParams): Promise<ApiResponse<PageResult<SalesTargetVO>>> {
    return request.get('/sales-targets', { params })
  },

  getDetail(id: number): Promise<ApiResponse<SalesTargetVO>> {
    return request.get(`/sales-targets/${id}`)
  },

  create(data: CreateSalesTargetParams): Promise<ApiResponse<SalesTargetVO>> {
    return request.post('/sales-targets', data)
  },

  update(id: number, data: UpdateSalesTargetParams): Promise<ApiResponse<SalesTargetVO>> {
    return request.put(`/sales-targets/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/sales-targets/${id}`)
  },

  decompose(id: number, items: DecomposeItem[]): Promise<ApiResponse<SalesTargetVO[]>> {
    return request.post(`/sales-targets/${id}/decompose`, { items })
  },

  getAchievement(id: number): Promise<ApiResponse<AchievementInfo>> {
    return request.get(`/sales-targets/${id}/achievement`)
  },

  getForecast(id: number): Promise<ApiResponse<ForecastInfo>> {
    return request.get(`/sales-targets/${id}/forecast`)
  },

  getOverview(year?: number): Promise<ApiResponse<OverviewItem[]>> {
    return request.get('/sales-targets/overview', { params: year ? { year } : {} })
  },

  getSalesRanking(params: {
    metricType: TargetMetricType
    period: TargetPeriod
    year: number
    quarter?: number
    month?: number
    limit?: number
  }): Promise<ApiResponse<RankingItem[]>> {
    return request.get('/sales-targets/ranking/sales', { params })
  },

  getTeamRanking(params: {
    metricType: TargetMetricType
    year: number
    quarter?: number
  }): Promise<ApiResponse<TeamRankingItem[]>> {
    return request.get('/sales-targets/ranking/team', { params })
  },

  getRankingTrend(params: {
    userId: number
    metricType: TargetMetricType
    year: number
  }): Promise<ApiResponse<RankingItem[]>> {
    return request.get('/sales-targets/ranking/trend', { params })
  },
}
