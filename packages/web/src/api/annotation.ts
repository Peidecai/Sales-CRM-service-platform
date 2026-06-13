import request from './request'
import type { ApiResponse, PageResult } from './types'
import { AnnotationTargetType } from '@crm/shared'

export { AnnotationTargetType }

export interface AnnotationVO {
  id: number
  userId: number
  targetType: AnnotationTargetType
  targetId: number
  content: string
  pageX: number | null
  pageY: number | null
  resolved: boolean
  resolvedById: number | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnnotationQueryParams {
  page?: number
  pageSize?: number
  targetType?: AnnotationTargetType
  targetId?: number
  resolved?: boolean
}

export interface CreateAnnotationParams {
  targetType: AnnotationTargetType
  targetId: number
  content: string
  pageX?: number
  pageY?: number
}

export const annotationApi = {
  list(params?: AnnotationQueryParams): Promise<ApiResponse<PageResult<AnnotationVO>>> {
    return request.get('/annotations', { params: params ?? {} })
  },

  get(id: number): Promise<ApiResponse<AnnotationVO>> {
    return request.get(`/annotations/${id}`)
  },

  getMy(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PageResult<AnnotationVO>>> {
    return request.get('/annotations/my', { params: params ?? {} })
  },

  getByTarget(targetType: string, targetId: number): Promise<ApiResponse<AnnotationVO[]>> {
    return request.get(`/annotations/target/${targetType}/${targetId}`)
  },

  create(data: CreateAnnotationParams): Promise<ApiResponse<AnnotationVO>> {
    return request.post('/annotations', data)
  },

  update(id: number, data: { content?: string }): Promise<ApiResponse<AnnotationVO>> {
    return request.put(`/annotations/${id}`, data)
  },

  resolve(id: number): Promise<ApiResponse<AnnotationVO>> {
    return request.put(`/annotations/${id}/resolve`)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/annotations/${id}`)
  },
}
