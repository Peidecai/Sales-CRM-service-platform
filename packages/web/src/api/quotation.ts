import request from './request'
import type { ApiResponse, PageResult } from './types'
import { QuotationStatus } from '@crm/shared'

export { QuotationStatus }

export interface QuotationItemVO {
  id: number
  productName: string
  productSpec: string | null
  unit: string | null
  quantity: number
  unitPrice: number
  listPrice: number
  discountRate: number
  lineAmount: number
  sortOrder: number
  remark: string | null
}

export interface QuotationVO {
  id: number
  quotationNo: string
  title: string
  opportunityId: number
  customerId: number
  contactId: number | null
  ownerId: number
  version: number
  currency: string
  subtotal: number
  discountType: string | null
  discountValue: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  validUntil: string
  paymentTerms: string | null
  deliveryTerms: string | null
  remark: string | null
  status: QuotationStatus
  sentAt: string | null
  acceptedAt: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
  items: QuotationItemVO[]
}

export interface QuotationQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: QuotationStatus
  opportunityId?: number
  customerId?: number
}

export interface CreateQuotationItemParams {
  productName: string
  productSpec?: string
  unit?: string
  quantity: number
  unitPrice: number
  listPrice?: number
  discountRate?: number
  sortOrder?: number
  remark?: string
}

export interface CreateQuotationParams {
  title: string
  opportunityId: number
  customerId: number
  contactId?: number
  currency?: string
  discountType?: string
  discountValue?: number
  taxRate?: number
  validUntil: string
  paymentTerms?: string
  deliveryTerms?: string
  remark?: string
  items: CreateQuotationItemParams[]
}

export type UpdateQuotationParams = Partial<CreateQuotationParams>

export const quotationApi = {
  getList(params: QuotationQueryParams): Promise<ApiResponse<PageResult<QuotationVO>>> {
    return request.get('/quotations', { params })
  },
  getDetail(id: number): Promise<ApiResponse<QuotationVO>> {
    return request.get(`/quotations/${id}`)
  },
  create(data: CreateQuotationParams): Promise<ApiResponse<QuotationVO>> {
    return request.post('/quotations', data)
  },
  update(id: number, data: UpdateQuotationParams): Promise<ApiResponse<QuotationVO>> {
    return request.put(`/quotations/${id}`, data)
  },
  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/quotations/${id}`)
  },
}
