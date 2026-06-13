import request from './request'
import type { ApiResponse } from './types'

export interface UnicomPhoneBindingVO {
  id: number
  phone: string
  userId: number
  userName: string | null
  username: string | null
  userPhone: string | null
  isEnabled: boolean
  remark: string | null
  recordCallbackUrl: string
  transcriptionCallbackUrl: string
  createdAt: string
  updatedAt: string
}

export interface UnicomPhoneBindingPayload {
  phone?: string
  userId?: number
  isEnabled?: boolean
  remark?: string | null
}

export const unicomPhoneBindingApi = {
  getAll(): Promise<ApiResponse<UnicomPhoneBindingVO[]>> {
    return request.get('/unicom-phone-bindings')
  },

  create(data: UnicomPhoneBindingPayload): Promise<ApiResponse<UnicomPhoneBindingVO>> {
    return request.post('/unicom-phone-bindings', data)
  },

  update(id: number, data: UnicomPhoneBindingPayload): Promise<ApiResponse<UnicomPhoneBindingVO>> {
    return request.put(`/unicom-phone-bindings/${id}`, data)
  },

  remove(id: number): Promise<ApiResponse<null>> {
    return request.delete(`/unicom-phone-bindings/${id}`)
  },
}
