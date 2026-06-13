import request from './request'
import type { ApiResponse, PageResult } from './types'
import { ContractStatus, ContractType } from '@crm/shared'

export { ContractStatus, ContractType }

// Contract VO returned from backend
export interface ContractVO {
  id: number
  contractNo: string
  title: string
  contractType: ContractType
  opportunityId: number | null
  quotationId: number | null
  customerId: number
  ownerId: number
  ourEntity: string
  customerEntity: string
  currency: string
  totalAmount: number
  paidAmount: number
  startDate: string
  endDate: string
  signDate: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  status: ContractStatus
  signFileUrl: string | null
  renewalReminderDays: number
  parentContractId: number | null
  originalContractId: number | null
  renewedAt: string | null
  attachments: Record<string, unknown>[] | null
  customFields: Record<string, unknown> | null
  createdBy: number
  createdAt: string
  updatedAt: string
  deleted: boolean
}

export interface ContractTemplateVO {
  id: number
  name: string
  content: string
  category: string | null
  variables: Array<{ name: string; label: string; type: string; required: boolean }> | null
  isDefault: boolean
  createdBy: number
  createdAt: string
  updatedAt: string
}

// Query params
export interface ContractQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: ContractStatus
  contractType?: ContractType
  customerId?: number
  ownerId?: number
}

export interface ContractTemplateQueryParams {
  page?: number
  pageSize?: number
  category?: string
}

// Create params
export interface CreateContractParams {
  title: string
  contractType: ContractType
  opportunityId?: number
  quotationId?: number
  customerId: number
  ownerId: number
  ourEntity: string
  customerEntity: string
  currency?: string
  totalAmount: number
  startDate: string
  endDate: string
  signDate?: string
  paymentTerms?: string
  deliveryTerms?: string
  status?: ContractStatus
  signFileUrl?: string
  renewalReminderDays?: number
  parentContractId?: number
  attachments?: Record<string, unknown>[]
  customFields?: Record<string, unknown>
}

// Update params (all optional)
export type UpdateContractParams = Partial<CreateContractParams>

// Sign params
export interface ConfirmSignParams {
  signFileUrl?: string
}

export const contractApi = {
  getList(params: ContractQueryParams): Promise<ApiResponse<PageResult<ContractVO>>> {
    return request.get('/contracts', { params })
  },

  getDetail(id: number): Promise<ApiResponse<ContractVO>> {
    return request.get(`/contracts/${id}`)
  },

  create(data: CreateContractParams): Promise<ApiResponse<ContractVO>> {
    return request.post('/contracts', data)
  },

  update(id: number, data: UpdateContractParams): Promise<ApiResponse<ContractVO>> {
    return request.put(`/contracts/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/contracts/${id}`)
  },

  getExpiring(days?: number): Promise<ApiResponse<ContractVO[]>> {
    return request.get('/contracts/expiring', { params: { days } })
  },

  confirmSign(id: number, data?: ConfirmSignParams): Promise<ApiResponse<ContractVO>> {
    return request.put(`/contracts/${id}/sign`, data ?? {})
  },

  renew(
    id: number,
    data: { newEndDate: string; newAmount: number },
  ): Promise<ApiResponse<ContractVO>> {
    return request.post(`/contracts/${id}/renew`, data)
  },

  eSign(id: number): Promise<ApiResponse<{ message: string }>> {
    return request.post(`/contracts/${id}/e-sign`)
  },

  // Templates
  getTemplates(
    params?: ContractTemplateQueryParams,
  ): Promise<ApiResponse<PageResult<ContractTemplateVO>>> {
    return request.get('/contracts/templates', { params })
  },

  createTemplate(data: Partial<ContractTemplateVO>): Promise<ApiResponse<ContractTemplateVO>> {
    return request.post('/contracts/templates', data)
  },

  updateTemplate(
    id: number,
    data: Partial<ContractTemplateVO>,
  ): Promise<ApiResponse<ContractTemplateVO>> {
    return request.put(`/contracts/templates/${id}`, data)
  },

  removeTemplate(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/contracts/templates/${id}`)
  },

  createFromTemplate(data: {
    templateId: number
    variables: Record<string, string>
    contractData: CreateContractParams
  }): Promise<ApiResponse<ContractVO>> {
    return request.post('/contracts/from-template', data)
  },
}
