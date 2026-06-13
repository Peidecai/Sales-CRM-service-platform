import request from './request'

export interface MaskingRuleVO {
  id: number
  name: string
  entityName: string
  fieldName: string
  maskType: 'partial' | 'full' | 'hash'
  pattern: string | null
  exemptRoles: string[] | null
  exemptPermission: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MaskingRuleQueryParams {
  page?: number
  pageSize?: number
  entityName?: string
  isActive?: boolean
}

export interface CreateMaskingRuleData {
  name: string
  entityName: string
  fieldName: string
  maskType: 'partial' | 'full' | 'hash'
  pattern?: string
  exemptRoles?: string[]
  exemptPermission?: string
}

export const dataMaskingApi = {
  getRules(params: MaskingRuleQueryParams) {
    return request.get('/data-masking/rules', { params })
  },
  createRule(data: CreateMaskingRuleData) {
    return request.post('/data-masking/rules', data)
  },
  updateRule(id: number, data: Partial<CreateMaskingRuleData>) {
    return request.put(`/data-masking/rules/${id}`, data)
  },
  deleteRule(id: number) {
    return request.delete(`/data-masking/rules/${id}`)
  },
  toggleStatus(id: number, isActive: boolean) {
    return request.put(`/data-masking/rules/${id}/status`, { isActive })
  },
  unmask(data: { entityName: string; fieldName: string; recordId: number }) {
    return request.post('/data-masking/unmask', data)
  },
  preview(params: { value: string; maskType: string; pattern?: string }) {
    return request.get('/data-masking/preview', { params })
  },
}
