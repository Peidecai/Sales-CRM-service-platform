import request from './request'

export const getTags = (params?: { group?: string }) => request.get('/api/v1/tags', { params })

export const createTag = (data: { name: string; color?: string; group?: string }) =>
  request.post('/api/v1/tags', data)

export const updateTag = (id: number, data: Record<string, unknown>) =>
  request.put(`/api/v1/tags/${id}`, data)

export const deleteTag = (id: number) => request.delete(`/api/v1/tags/${id}`)

export const addTagToCustomer = (customerId: number, tagIds: number[]) =>
  request.post(`/api/v1/customers/${customerId}/tags`, { tagIds })

export const removeTagFromCustomer = (customerId: number, tagId: number) =>
  request.delete(`/api/v1/customers/${customerId}/tags/${tagId}`)

export const batchAddTags = (customerIds: number[], tagIds: number[]) =>
  request.post('/api/v1/customers/batch-tags', { customerIds, tagIds })
