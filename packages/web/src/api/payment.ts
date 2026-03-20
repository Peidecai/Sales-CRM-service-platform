import request from './request'
import type { ApiResponse, PageResult } from './types'
import { PaymentStatus, PaymentMethod } from '@crm/shared'

export { PaymentStatus, PaymentMethod }

// ── VO Types ─────────────────────────────────────────────────────────────

export interface PaymentVO {
  id: number
  paymentNo: string
  contractId: number
  opportunityId: number | null
  customerId: number
  ownerId: number
  periodNo: number | null
  plannedAmount: number | null
  actualAmount: number | null
  plannedDate: string | null
  actualDate: string | null
  paymentMethod: PaymentMethod | null
  bankTransactionNo: string | null
  invoiceNo: string | null
  isOverdue: boolean
  overdueDays: number
  status: PaymentStatus
  confirmUserId: number | null
  confirmedAt: string | null
  remark: string | null
  attachments: unknown[] | null
  createdBy: number
  createdAt: string
  updatedAt: string
  deleted: boolean
}

// ── Query Params ──────────────────────────────────────────────────────────

export interface PaymentQueryParams {
  page?: number
  pageSize?: number
  contractId?: number
  customerId?: number
  ownerId?: number
  status?: PaymentStatus
  isOverdue?: boolean
}

// ── Create/Update Params ──────────────────────────────────────────────────

export interface CreatePaymentParams {
  contractId: number
  opportunityId?: number
  customerId: number
  ownerId: number
  periodNo?: number
  plannedAmount?: number
  actualAmount?: number
  plannedDate?: string
  actualDate?: string
  paymentMethod?: PaymentMethod
  bankTransactionNo?: string
  invoiceNo?: string
  status?: PaymentStatus
  remark?: string
  attachments?: unknown[]
  isOverdue?: boolean
}

export type UpdatePaymentParams = Partial<CreatePaymentParams>

// ── Confirm Params ────────────────────────────────────────────────────────

export interface ConfirmPaymentParams {
  actualAmount: number
  actualDate: string
  paymentMethod: PaymentMethod
  bankTransactionNo?: string
}

export interface PaymentStatisticsVO {
  totalPlanned: number
  totalReceived: number
  overdueAmount: number
  overdueRate: number
  collectionRate: number
}

export interface PaymentStatisticsParams {
  startDate?: string
  endDate?: string
  ownerId?: number
  customerId?: number
}

// ── API ───────────────────────────────────────────────────────────────────

export const paymentApi = {
  getList(params: PaymentQueryParams): Promise<ApiResponse<PageResult<PaymentVO>>> {
    return request.get('/payments', { params })
  },

  getOverdue(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PageResult<PaymentVO>>> {
    return request.get('/payments/overdue', { params })
  },

  getStatistics(params?: PaymentStatisticsParams): Promise<ApiResponse<PaymentStatisticsVO>> {
    return request.get('/payments/statistics', { params })
  },

  getDetail(id: number): Promise<ApiResponse<PaymentVO>> {
    return request.get(`/payments/${id}`)
  },

  create(data: CreatePaymentParams): Promise<ApiResponse<PaymentVO>> {
    return request.post('/payments', data)
  },

  update(id: number, data: UpdatePaymentParams): Promise<ApiResponse<PaymentVO>> {
    return request.put(`/payments/${id}`, data)
  },

  confirm(id: number, data: ConfirmPaymentParams): Promise<ApiResponse<PaymentVO>> {
    return request.put(`/payments/${id}/confirm`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/payments/${id}`)
  },
}
