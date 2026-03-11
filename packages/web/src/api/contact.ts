import request from './request'

export function getContactsByCustomer(customerId: number, params?: Record<string, unknown>) {
  return request.get(`/api/v1/customers/${customerId}/contacts`, { params })
}

export function createContact(customerId: number, data: Record<string, unknown>) {
  return request.post(`/api/v1/customers/${customerId}/contacts`, data)
}

export function updateContact(id: number, data: Record<string, unknown>) {
  return request.put(`/api/v1/contacts/${id}`, data)
}

export function deleteContact(id: number) {
  return request.delete(`/api/v1/contacts/${id}`)
}

export function setPrimaryContact(id: number) {
  return request.post(`/api/v1/contacts/${id}/set-primary`)
}

export function checkContactDuplicate(data: { mobile?: string; email?: string }) {
  return request.post('/api/v1/contacts/check-duplicate', data)
}
