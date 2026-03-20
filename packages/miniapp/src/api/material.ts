/**
 * Material API — 营销素材
 */
import { http } from './request'
import type { ApiResponse, PageResult } from '@crm/shared'

export interface MaterialVO {
  id: number
  name: string
  ossKey: string
  ossBucket: string
  fileSize: number
  mimeType: string | null
  thumbnailKey: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  category: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
}

export interface MaterialQueryParams {
  page?: number
  pageSize?: number
  category?: string
  keyword?: string
}

export const materialApi = {
  getMaterials(params: MaterialQueryParams): Promise<ApiResponse<PageResult<MaterialVO>>> {
    return http.get('/materials', params as unknown as Record<string, unknown>)
  },

  getMaterial(id: number): Promise<ApiResponse<MaterialVO>> {
    return http.get(`/materials/${id}`)
  },

  getMaterialUrl(id: number): Promise<ApiResponse<{ url: string }>> {
    return http.get(`/materials/${id}/url`)
  },
}
