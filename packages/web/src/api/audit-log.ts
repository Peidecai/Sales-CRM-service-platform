import request from './request'

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

export interface ApiResponse<T> {
  code: number
  message: string
  data: T | null
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export const auditLogApi = {
  getList(params: AuditLogQueryParams): Promise<ApiResponse<PageResult<AuditLogVO>>> {
    return request.get('/audit-logs', { params })
  },
}
