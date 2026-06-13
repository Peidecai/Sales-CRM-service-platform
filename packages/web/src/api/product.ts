import request from './request'
import type { ApiResponse, PageResult } from './types'
import { ProductStatus } from '@crm/shared'

export { ProductStatus }

/* ========== VO 接口 ========== */

export interface ProductVO {
  id: number
  name: string
  code: string
  categoryId: number | null
  category: ProductCategoryVO | null
  price: number
  unit: string
  status: ProductStatus
  description: string | null
  specs: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface ProductCategoryVO {
  id: number
  name: string
  parentId: number | null
  sort: number
  children?: ProductCategoryVO[]
}

export interface OpportunityProductVO {
  id: number
  opportunityId: number
  productId: number
  product: ProductVO
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  createdAt: string
}

/* ========== 查询参数 ========== */

export interface ProductQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: ProductStatus
}

export interface LinkProductItem {
  productId: number
  quantity: number
  unitPrice: number
  discount: number
}

/* ========== API ========== */

export const productApi = {
  /** 产品分页列表 */
  getList(params: ProductQueryParams): Promise<ApiResponse<PageResult<ProductVO>>> {
    return request.get('/products', { params })
  },

  /** 产品详情 */
  getDetail(id: number): Promise<ApiResponse<ProductVO>> {
    return request.get(`/products/${id}`)
  },

  /** 创建产品 */
  create(data: Partial<ProductVO>): Promise<ApiResponse<ProductVO>> {
    return request.post('/products', data)
  },

  /** 更新产品 */
  update(id: number, data: Partial<ProductVO>): Promise<ApiResponse<ProductVO>> {
    return request.put(`/products/${id}`, data)
  },

  /** 删除产品 */
  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/products/${id}`)
  },

  /** 导出 CSV */
  exportCsv(): Promise<Blob> {
    return request.get('/products/export', { responseType: 'blob' })
  },

  // ---- 分类 ----

  /** 获取分类树 */
  getCategoryTree(): Promise<ApiResponse<ProductCategoryVO[]>> {
    return request.get('/products/categories/tree')
  },

  /** 创建分类 */
  createCategory(data: {
    name: string
    parentId?: number
    sort?: number
  }): Promise<ApiResponse<ProductCategoryVO>> {
    return request.post('/products/categories', data)
  },

  /** 更新分类 */
  updateCategory(
    id: number,
    data: { name: string; parentId?: number; sort?: number },
  ): Promise<ApiResponse<ProductCategoryVO>> {
    return request.put(`/products/categories/${id}`, data)
  },

  /** 删除分类 */
  removeCategory(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/products/categories/${id}`)
  },

  // ---- 商机产品关联 ----

  /** 获取商机关联产品 */
  getOpportunityProducts(opportunityId: number): Promise<ApiResponse<OpportunityProductVO[]>> {
    return request.get(`/products/opportunities/${opportunityId}/products`)
  },

  /** 关联产品到商机 */
  linkProducts(
    opportunityId: number,
    items: LinkProductItem[],
  ): Promise<ApiResponse<OpportunityProductVO[]>> {
    return request.post(`/products/opportunities/${opportunityId}/products`, { items })
  },

  /** 移除商机产品关联 */
  unlinkProduct(opportunityId: number, id: number): Promise<ApiResponse<null>> {
    return request.delete(`/products/opportunities/${opportunityId}/products/${id}`)
  },
}
