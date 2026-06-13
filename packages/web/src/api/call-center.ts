import request from './request'
import type { ApiResponse, PageResult } from './types'

export interface CallLogVO {
  id: number
  direction: string
  callerNumber: string
  calleeNumber: string
  customerName: string | null
  agentName: string | null
  status: string
  duration: number
  recordingUrl: string | null
  startTime: string
  endTime: string | null
  createdAt: string
}

export interface AgentStatusVO {
  id: number
  agentName: string
  status: string
  currentCallId: number | null
  lastActiveAt: string
}

export interface CallStatsVO {
  totalCalls: number
  connectedCalls: number
  connectionRate: number
  averageDuration: number
  totalDuration: number
  inboundCount: number
  outboundCount: number
}

export interface CallLogQueryParams {
  page?: number
  pageSize?: number
  direction?: string
  status?: string
  agentId?: number
  startDate?: string
  endDate?: string
  keyword?: string
}

export const callCenterApi = {
  dial(data: { phoneNumber: string; customerId?: number }): Promise<ApiResponse<unknown>> {
    return request.post('/calls/dial', data)
  },
  hangup(callId: number): Promise<ApiResponse<null>> {
    return request.post(`/calls/${callId}/hangup`)
  },
  transfer(callId: number, targetAgentId: number): Promise<ApiResponse<null>> {
    return request.post(`/calls/${callId}/transfer`, { targetAgentId })
  },
  getAgentStatus(): Promise<ApiResponse<AgentStatusVO[]>> {
    return request.get('/agents/status')
  },
  getCallStats(params?: {
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<CallStatsVO>> {
    return request.get('/calls/stats', { params })
  },
  getCallLogs(params: CallLogQueryParams): Promise<ApiResponse<PageResult<CallLogVO>>> {
    return request.get('/call-records', { params })
  },
  getCampaigns(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PageResult<unknown>>> {
    return request.get('/campaigns', { params })
  },
}
