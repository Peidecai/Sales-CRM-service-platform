import request from './request'
import type { ApiResponse, PageResult } from './types'

export interface MaterialVO {
  id: number
  name: string
  ossKey: string
  ossBucket: string
  fileSize: number
  mimeType: string | null
  thumbnailKey: string | null
  category: string | null
  createdAt: string
  updatedAt: string
}

export interface MaterialQueryParams {
  category?: string
  mimeType?: string
  page?: number
  pageSize?: number
}

export const materialApi = {
  list(params: MaterialQueryParams): Promise<ApiResponse<PageResult<MaterialVO>>> {
    return request.get('/materials', { params })
  },

  get(id: number): Promise<ApiResponse<MaterialVO>> {
    return request.get(`/materials/${id}`)
  },

  getUrl(id: number): Promise<ApiResponse<{ url: string }>> {
    return request.get(`/materials/${id}/url`)
  },

  getPreviewUrl(
    id: number,
    mode?: 'inline' | 'download',
  ): Promise<ApiResponse<{ url: string; mimeType: string | null; strategy: string }>> {
    return request.get(`/materials/${id}/preview-url`, { params: { mode } })
  },

  getStsToken(): Promise<
    ApiResponse<{
      accessKeyId: string
      accessKeySecret: string
      securityToken: string
      expiration: string
    }>
  > {
    return request.get('/materials/upload/sts-token')
  },

  update(id: number, data: { name?: string; category?: string }): Promise<ApiResponse<MaterialVO>> {
    return request.put(`/materials/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/materials/${id}`)
  },

  stats(): Promise<ApiResponse<{ byType: Record<string, number>; total: number }>> {
    return request.get('/materials/stats')
  },

  favorite(id: number): Promise<ApiResponse<null>> {
    return request.post(`/materials/${id}/favorite`)
  },

  unfavorite(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/materials/${id}/favorite`)
  },
}
