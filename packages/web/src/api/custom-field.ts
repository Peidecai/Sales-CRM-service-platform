import request from './request'

export const getFieldDefinitions = () => request.get('/api/v1/custom-fields')

export const createFieldDefinition = (data: Record<string, unknown>) =>
  request.post('/api/v1/custom-fields', data)

export const updateFieldDefinition = (id: number, data: Record<string, unknown>) =>
  request.put(`/api/v1/custom-fields/${id}`, data)

export const deleteFieldDefinition = (id: number) => request.delete(`/api/v1/custom-fields/${id}`)
