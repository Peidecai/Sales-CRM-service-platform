import request from './request'
import type { ApiResponse, PageResult } from './types'

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface AuditLogVO {
  id: number
  userId: number
  username: string
  action: AuditAction
  resource: string
  resourceId: number
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string
  createdAt: string
}

export interface AuditLogQueryParams {
  page?: number
  pageSize?: number
  userId?: number
  resource?: string
  action?: AuditAction
}

export const auditLogApi = {
  getList(params: AuditLogQueryParams): Promise<ApiResponse<PageResult<AuditLogVO>>> {
    return request.get('/audit-logs', { params })
  },
}
