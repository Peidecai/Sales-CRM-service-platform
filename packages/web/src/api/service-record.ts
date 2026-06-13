import request from './request'
import type { PageResult } from './types'
import { ServiceType, ServiceStatus, ServicePriority } from '@crm/shared'

export { ServiceType, ServiceStatus, ServicePriority }

/* ========== VO ========== */

export interface ServiceRecordVO {
  id: number
  title: string
  description: string
  type: ServiceType
  status: ServiceStatus
  priority: ServicePriority
  customerId: number
  contractId: number | null
  assigneeId: number | null
  createdBy: number
  resolution: string | null
  satisfactionScore: number | null
  satisfactionComment: string | null
  slaResponseDeadline: string | null
  slaResolveDeadline: string | null
  respondedAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  customer?: { id: number; name: string; company: string }
}

export interface ServiceStatisticsVO {
  total: number
  byStatus: Array<{ status: string; count: string }>
  byType: Array<{ type: string; count: string }>
  avgSatisfaction: number | null
  avgResponseTimeHours: number | null
  avgResolveTimeHours: number | null
  slaResponseComplianceRate: number | null
}

/* ========== Params ========== */

export interface ServiceRecordQueryParams {
  page?: number
  pageSize?: number
  status?: ServiceStatus
  type?: ServiceType
  priority?: ServicePriority
  customerId?: number
  assigneeId?: number
  keyword?: string
}

export interface CreateServiceRecordParams {
  title: string
  description: string
  type: ServiceType
  priority?: ServicePriority
  customerId: number
  contractId?: number
  assigneeId?: number
}

export interface CloseServiceRecordParams {
  satisfactionScore: number
  satisfactionComment?: string
  resolution?: string
}

/* ========== API ========== */

export const serviceRecordApi = {
  getList(params: ServiceRecordQueryParams): Promise<PageResult<ServiceRecordVO>> {
    return request.get('/service-records', { params })
  },

  getDetail(id: number): Promise<ServiceRecordVO> {
    return request.get(`/service-records/${id}`)
  },

  create(data: CreateServiceRecordParams): Promise<ServiceRecordVO> {
    return request.post('/service-records', data)
  },

  update(id: number, data: Partial<CreateServiceRecordParams>): Promise<ServiceRecordVO> {
    return request.put(`/service-records/${id}`, data)
  },

  updateStatus(id: number, status: ServiceStatus): Promise<ServiceRecordVO> {
    return request.put(`/service-records/${id}/status`, { status })
  },

  close(id: number, data: CloseServiceRecordParams): Promise<ServiceRecordVO> {
    return request.post(`/service-records/${id}/close`, data)
  },

  remove(id: number): Promise<null> {
    return request.delete(`/service-records/${id}`)
  },

  getStatistics(params?: { startDate?: string; endDate?: string }): Promise<ServiceStatisticsVO> {
    return request.get('/service-records/statistics', { params })
  },

  getSlaAlerts(): Promise<ServiceRecordVO[]> {
    return request.get('/service-records/sla-alerts')
  },

  exportCsv(): Promise<Blob> {
    return request.get('/service-records/export', { responseType: 'blob' })
  },
}
