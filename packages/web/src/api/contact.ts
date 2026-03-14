import request from './request'

export function getContactsByCustomer(customerId: number, params?: Record<string, unknown>) {
  return request.get(`/customers/${customerId}/contacts`, { params })
}

export function createContact(customerId: number, data: Record<string, unknown>) {
  return request.post(`/customers/${customerId}/contacts`, data)
}

export function updateContact(id: number, data: Record<string, unknown>) {
  return request.put(`/contacts/${id}`, data)
}

export function deleteContact(id: number) {
  return request.delete(`/contacts/${id}`)
}

export function setPrimaryContact(id: number) {
  return request.post(`/contacts/${id}/set-primary`)
}

export function checkContactDuplicate(data: { mobile?: string; email?: string }) {
  return request.post('/contacts/check-duplicate', data)
}
