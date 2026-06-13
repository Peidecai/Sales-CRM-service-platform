import request from './request'

export const getTags = (params?: { group?: string }) => request.get('/tags', { params })

export const createTag = (data: { name: string; color?: string; group?: string }) =>
  request.post('/tags', data)

export const updateTag = (id: number, data: Record<string, unknown>) =>
  request.put(`/tags/${id}`, data)

export const deleteTag = (id: number) => request.delete(`/tags/${id}`)

export const addTagToCustomer = (customerId: number, tagIds: number[]) =>
  request.post(`/customers/${customerId}/tags`, { tagIds })

export const removeTagFromCustomer = (customerId: number, tagId: number) =>
  request.delete(`/customers/${customerId}/tags/${tagId}`)

export const batchAddTags = (customerIds: number[], tagIds: number[]) =>
  request.post('/customers/batch-tags', { customerIds, tagIds })
