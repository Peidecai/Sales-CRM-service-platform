/**
 * Dashboard API — workbench stats
 */
import { http } from './request'
import type { ApiResponse } from '@crm/shared'

export interface DashboardStats {
  todayCalls: number
  todayCallsTrend: number
  newCustomers: number
  newCustomersTrend: number
  pendingFollowUps: number
  pendingFollowUpsTrend: number
  monthRevenue: number
  monthRevenueTrend: number
}

export const dashboardApi = {
  getStats(scope: 'personal' | 'team' = 'personal'): Promise<ApiResponse<DashboardStats>> {
    return http.get('/dashboard/stats', { scope })
  },
}
