import request from './request'
import type { ApiResponse, PageResult } from './types'
import { PostLoanStatus, RepaymentStatus } from '@crm/shared'

export { PostLoanStatus, RepaymentStatus }

export interface PostLoanVO {
  id: number
  contractId: number
  customerId: number
  loanAmount: number
  disbursedAt: string
  status: PostLoanStatus
  creditRating: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface RepaymentPlanVO {
  id: number
  postLoanId: number
  period: number
  dueDate: string
  amount: number
  paidAmount: number
  paidAt: string | null
  status: RepaymentStatus
  createdAt: string
  updatedAt: string
}

export interface PostLoanQueryParams {
  page?: number
  pageSize?: number
  status?: PostLoanStatus
}

export interface PostLoanStatisticsVO {
  totalLoans: number
  totalAmount: number
  normalCount: number
  overdueCount: number
  settledCount: number
}

export const postLoanApi = {
  getList(params: PostLoanQueryParams): Promise<ApiResponse<PageResult<PostLoanVO>>> {
    return request.get('/post-loans', { params })
  },

  getDetail(id: number): Promise<ApiResponse<PostLoanVO>> {
    return request.get(`/post-loans/${id}`)
  },

  create(data: {
    contractId: number
    loanAmount: number
    repaymentCount: number
    disbursedAt: string
  }): Promise<ApiResponse<PostLoanVO>> {
    return request.post('/post-loans', data)
  },

  getRepaymentPlans(id: number): Promise<ApiResponse<RepaymentPlanVO[]>> {
    return request.get(`/post-loans/${id}/repayment-plans`)
  },

  confirmRepayment(
    planId: number,
    data: {
      paidAmount: number
      paidAt: string
    },
  ): Promise<ApiResponse<RepaymentPlanVO>> {
    return request.put(`/post-loans/repayment-plans/${planId}/confirm`, data)
  },

  getOverdue(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PageResult<RepaymentPlanVO>>> {
    return request.get('/post-loans/overdue', { params })
  },

  getStatistics(): Promise<ApiResponse<PostLoanStatisticsVO>> {
    return request.get('/post-loans/statistics')
  },

  updateCreditRating(id: number, creditRating: string): Promise<ApiResponse<PostLoanVO>> {
    return request.put(`/post-loans/${id}/credit-rating`, { creditRating })
  },
}
